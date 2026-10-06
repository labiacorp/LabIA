import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { SocialError } from "./errors";
import { openToken, sealToken } from "./crypto";
import { AuthExpiredError, getPublisher } from "./publisher";
import type { AccountRef, Backend, ConnectedAccount } from "./publisher";

const REFRESH_WINDOW_MS = 2 * 60_000;
const TAKEN = "Esta conta já está conectada a outro usuário da LabIA.";

export async function saveConnectedAccounts(
  userId: string,
  backend: Backend,
  accounts: ConnectedAccount[],
  influencerId?: string | null,
): Promise<string[]> {
  const ids: string[] = [];
  for (const account of accounts) {
    const where = { backend_providerAccountId: { backend, providerAccountId: account.providerAccountId } };
    const existing = await prisma.socialAccount.findUnique({ where });
    if (existing && existing.userId !== userId) throw new SocialError(TAKEN);
    const id = existing?.id ?? randomUUID();
    const { tokens } = account;
    const data = {
      network: account.network,
      handle: account.handle,
      displayName: account.displayName ?? null,
      avatarUrl: account.avatarUrl ?? null,
      status: "CONNECTED" as const,
      accessToken: tokens ? sealToken(tokens.accessToken, id) : null,
      refreshToken: tokens?.refreshToken ? sealToken(tokens.refreshToken, id) : null,
      tokenExpiresAt: tokens?.expiresAt ?? null,
      scopes: tokens?.scopes ?? null,
      ...(influencerId !== undefined ? { influencerId } : {}),
    };
    if (existing) {
      // The userId in the filter keeps a concurrent takeover from writing into another owner's row.
      const { count } = await prisma.socialAccount.updateMany({ where: { id, userId }, data });
      if (count !== 1) throw new SocialError(TAKEN);
    } else {
      try {
        await prisma.socialAccount.create({ data: { id, userId, backend, providerAccountId: account.providerAccountId, ...data } });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new SocialError(TAKEN);
        throw error;
      }
    }
    ids.push(id);
  }
  return ids;
}

type Row = NonNullable<Awaited<ReturnType<typeof prisma.socialAccount.findUnique>>>;

const stale = (row: Row) => Boolean(row.tokenExpiresAt && row.tokenExpiresAt.getTime() - Date.now() < REFRESH_WINDOW_MS);
const toRef = (row: Row, accessToken: string | null): AccountRef => ({
  id: row.id,
  network: row.network,
  providerAccountId: row.providerAccountId,
  handle: row.handle,
  accessToken,
});

export async function accountRef(accountId: string): Promise<AccountRef> {
  let row = await prisma.socialAccount.findUnique({ where: { id: accountId } });
  if (!row) throw new SocialError("Conta não encontrada.");
  const publisher = getPublisher(row.backend as Backend);
  if (stale(row) && row.refreshToken && publisher.refresh) {
    try {
      row = await prisma.$transaction(
        async (tx) => {
          // Refresh tokens rotate and are single-use: serialize on the account row, re-read, refresh only if still stale.
          await tx.$queryRaw`SELECT id FROM social_accounts WHERE id = ${accountId} FOR UPDATE`;
          const fresh = await tx.socialAccount.findUnique({ where: { id: accountId } });
          if (!fresh) throw new SocialError("Conta não encontrada.");
          if (!stale(fresh) || !fresh.refreshToken) return fresh;
          const tokens = await publisher.refresh!(openToken(fresh.refreshToken, fresh.id));
          return tx.socialAccount.update({
            where: { id: fresh.id },
            data: {
              accessToken: sealToken(tokens.accessToken, fresh.id),
              refreshToken: tokens.refreshToken ? sealToken(tokens.refreshToken, fresh.id) : null,
              tokenExpiresAt: tokens.expiresAt,
              ...(tokens.scopes ? { scopes: tokens.scopes } : {}),
            },
          });
        },
        { timeout: 20_000 },
      );
    } catch (error) {
      if (error instanceof AuthExpiredError) {
        await prisma.socialAccount.update({ where: { id: accountId }, data: { status: "EXPIRED" } });
      }
      throw error;
    }
  }
  return toRef(row, row.accessToken ? openToken(row.accessToken, row.id) : null);
}
