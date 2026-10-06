import { Prisma } from "@/generated/prisma/client";
import type { SocialPostStatus } from "@/generated/prisma/enums";
import { hasUnlimitedBalance } from "@/lib/ledger";
import { prisma } from "@/lib/prisma";
import { accountRef } from "./accounts";
import { SocialError } from "./errors";
import { assetMedia } from "./media";
import { NETWORKS, textLength } from "./networks";
import type { NetworkId } from "./networks";
import { quotePost } from "./pricing";
import { AuthExpiredError, getPublisher } from "./publisher";
import type { AccountRef, Backend, FailureReason, MediaRef, PublishOutcome, Publisher } from "./publisher";

export { SocialError };

const MIN_MS = 60_000;
const STALE_CLAIM_MS = 5 * MIN_MS;
const MIN_LEAD_MS = 5 * MIN_MS;
const MAX_LEAD_MS = 30 * 24 * 60 * MIN_MS;
const UNKNOWN_COPY = "Não confirmamos se a publicação saiu. A equipe vai verificar.";

export const FAILURE_COPY: Record<FailureReason, string> = {
  auth_expired: "A conexão expirou. Reconecte a conta e tente de novo.",
  media_rejected: "A rede recusou a mídia. Confira o formato e o tamanho.",
  text_rejected: "A rede recusou o texto. Ajuste e tente de novo.",
  rate_limited: "A rede limitou os envios por agora. Tente de novo em alguns minutos.",
  platform_error: "A rede não aceitou a publicação agora. Tente de novo.",
};

const usdBrlRate = () => Number(process.env.USD_BRL_RATE) || 5.4;
const round4 = (n: number) => Math.round(n * 10_000) / 10_000;
const num = (d: { toString(): string } | null | undefined) => Number(d?.toString() ?? 0);
const networkInfo = (id: NetworkId) => NETWORKS.find((n) => n.id === id)!;

export function quoteAccounts(accounts: { network: NetworkId }[], text: string) {
  const items = accounts.map((a) => ({ network: a.network, brl: quotePost(a.network, text, usdBrlRate()).brl }));
  return { totalBrl: round4(items.reduce((sum, i) => sum + i.brl, 0)), items };
}

type CreateInput = {
  userId: string;
  intentId: string;
  accountIds: string[];
  assetId: string | null;
  contentId: string | null;
  text: string;
  aiLabel: boolean;
  scheduledAt: Date | null;
  expectedBrl: number;
};

export async function createPosts(input: CreateInput): Promise<{ postIds: string[] }> {
  const text = input.text;
  // A retry of the same intent returns what exists, before any validation or quote.
  const priorKeys = [...new Set(input.accountIds)].map((id) => `${input.intentId}:${id}`);
  if (priorKeys.length) {
    const prior = await prisma.socialPost.findMany({ where: { userId: input.userId, operationKey: { in: priorKeys } }, select: { id: true } });
    if (prior.length) return { postIds: prior.map((p) => p.id) };
  }
  if (!text.trim()) throw new SocialError("Escreva o texto da publicação.");
  const accountIds = [...new Set(input.accountIds)];
  if (!accountIds.length) throw new SocialError("Escolha ao menos uma conta.");

  const now = new Date();
  if (input.scheduledAt) {
    const lead = input.scheduledAt.getTime() - now.getTime();
    if (!(lead >= MIN_LEAD_MS && lead <= MAX_LEAD_MS)) throw new SocialError("Escolha um horário entre 5 minutos e 30 dias à frente.");
  }

  const accounts = await prisma.socialAccount.findMany({ where: { id: { in: accountIds }, userId: input.userId } });
  if (accounts.length !== accountIds.length) throw new SocialError("Conta não encontrada.");
  const asset = input.assetId ? await prisma.asset.findFirst({ where: { id: input.assetId, userId: input.userId } }) : null;
  if (input.assetId && !asset) throw new SocialError("Mídia não encontrada.");
  if (input.contentId && !(await prisma.content.findFirst({ where: { id: input.contentId, influencer: { userId: input.userId } } })))
    throw new SocialError("Conteúdo não encontrado.");
  if (accounts.some((a) => a.backend === "bundle")) {
    // Bundle networks are owner-only for now (same rule as requireOwner, without notFound).
    const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { role: true } });
    if (user?.role !== "OWNER") throw new SocialError("Esta rede ainda não está disponível para a sua conta.");
  }
  for (const account of accounts) {
    const info = networkInfo(account.network);
    if (account.status !== "CONNECTED") throw new SocialError(`Reconecte a conta @${account.handle} antes de publicar.`);
    if (textLength(account.network, text) > info.maxText) throw new SocialError(`O texto passa do limite do ${info.label} (${info.maxText} caracteres).`);
    if (asset && !(asset.kind === "IMAGE" || asset.kind === "VIDEO" ? info.media.includes(asset.kind) : false))
      throw new SocialError(`O ${info.label} não aceita este tipo de mídia.`);
  }

  // The server price is the only price; the client's figure is just the amount the user approved.
  const priced = quoteAccounts(accounts, text);
  if (Math.abs(priced.totalBrl - input.expectedBrl) > 0.0001) throw new SocialError("O preço mudou; confira o novo valor.");
  const costOf = new Map(accounts.map((a, i) => [a.id, priced.items[i].brl]));
  const keyOf = (accountId: string) => `${input.intentId}:${accountId}`;
  const keys = accounts.map((a) => keyOf(a.id));
  const existingIds = async () =>
    (await prisma.socialPost.findMany({ where: { operationKey: { in: keys } }, select: { id: true } })).map((p) => p.id);

  let postIds: string[];
  try {
    postIds = await prisma.$transaction(async (tx) => {
      // Serialize spends per user so two requests cannot both pass the balance check.
      const [me] = await tx.$queryRaw<{ email: string }[]>`SELECT email FROM users WHERE id = ${input.userId} FOR UPDATE`;
      const existing = await tx.socialPost.findMany({ where: { operationKey: { in: keys } }, select: { id: true } });
      if (existing.length) return existing.map((p) => p.id); // same intent again: nothing to charge
      const { _sum } = await tx.ledgerEntry.aggregate({ where: { userId: input.userId }, _sum: { deltaBrl: true } });
      const balance = num(_sum.deltaBrl);
      if (!hasUnlimitedBalance(me?.email) && balance + 1e-9 < priced.totalBrl)
        throw new SocialError(`Saldo insuficiente: você tem R$ ${balance.toFixed(2)} e precisa de R$ ${priced.totalBrl.toFixed(2)}.`);
      const ids: string[] = [];
      for (const account of accounts) {
        const cost = costOf.get(account.id)!;
        const post = await tx.socialPost.create({
          data: {
            userId: input.userId,
            accountId: account.id,
            contentId: input.contentId,
            assetId: input.assetId,
            text,
            aiLabel: input.aiLabel,
            scheduledAt: input.scheduledAt ?? now,
            operationKey: keyOf(account.id),
            estimatedCostBrl: cost,
          },
        });
        if (cost > 0)
          await tx.ledgerEntry.create({
            data: { userId: input.userId, deltaBrl: -cost, reason: "SPEND", socialPostId: post.id, note: `Reserva: publicação ${networkInfo(account.network).label}` },
          });
        ids.push(post.id);
      }
      return ids;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") postIds = await existingIds(); // lost a race on the same intent
    else throw error;
  }

  // Due posts go out now; bundle posts with a future time are handed to the backend's own scheduler.
  await dispatchDuePosts({ userId: input.userId, limit: 3, budgetMs: 100_000 });
  return { postIds };
}

export async function dispatchDuePosts(opts: { userId?: string; now?: Date; limit?: number; budgetMs?: number } = {}) {
  const startedAt = Date.now();
  const now = opts.now ?? new Date();
  const result = { published: 0, scheduled: 0, failed: 0, unknown: 0 };
  const owner = opts.userId ? { userId: opts.userId } : {};

  const stale = await prisma.socialPost.updateMany({
    where: { ...owner, status: "PUBLISHING", claimedAt: { lt: new Date(now.getTime() - STALE_CLAIM_MS) } },
    data: { status: "UNKNOWN", error: UNKNOWN_COPY },
  });
  result.unknown += stale.count;

  const due = await prisma.socialPost.findMany({
    where: {
      ...owner,
      status: "SCHEDULED",
      providerPostId: null,
      OR: [{ scheduledAt: { lte: now } }, { account: { backend: "bundle" } }],
    },
    include: { account: { select: { backend: true, status: true, userId: true } } },
    orderBy: { scheduledAt: "asc" },
    take: opts.limit ?? 25,
  });

  let handled = 0;
  for (const post of due) {
    if (handled > 0 && opts.budgetMs !== undefined && Date.now() - startedAt > opts.budgetMs) break; // leave the rest for the next run
    // Compare-and-set claim: only the winner talks to the backend.
    const claim = await prisma.socialPost.updateMany({
      where: { id: post.id, status: "SCHEDULED", providerPostId: null },
      data: { status: "PUBLISHING", claimedAt: new Date() },
    });
    if (claim.count !== 1) continue;
    handled++;

    let outcome: PublishOutcome;
    let account: AccountRef | undefined;
    let publisher: Publisher | undefined;
    let media: MediaRef | null = null;
    let reason: FailureReason | null = null;
    try {
      if (post.account.status !== "CONNECTED") throw new AuthExpiredError("Account not connected");
      if (post.account.userId !== post.userId) throw new Error("Account belongs to another user"); // defense in depth: never send, never expire the account
      publisher = getPublisher(post.account.backend as Backend);
      account = await accountRef(post.accountId);
    } catch (error) {
      reason = error instanceof AuthExpiredError ? "auth_expired" : "platform_error";
    }
    if (!reason && post.assetId) {
      try {
        media = await assetMedia(post.userId, post.assetId);
      } catch {
        reason = "media_rejected";
      }
    }
    if (reason || !account || !publisher) {
      outcome = { state: "failed", reason: reason ?? "platform_error" }; // nothing was sent
    } else {
      try {
        outcome = await publisher.publish({
          account,
          text: post.text,
          media,
          aiLabel: post.aiLabel,
          scheduledAt: post.scheduledAt,
          operationKey: post.operationKey,
        });
      } catch {
        outcome = { state: "unknown" }; // the request may have left: never resend, keep the reservation
      }
    }
    await applyOutcome(post.id, outcome);
    result[outcome.state === "published" ? "published" : outcome.state === "scheduled" ? "scheduled" : outcome.state === "failed" ? "failed" : "unknown"]++;
  }
  return result;
}

const OPEN: SocialPostStatus[] = ["SCHEDULED", "PUBLISHING"];

// Forward-only: PUBLISHED, FAILED, CANCELED and UNKNOWN never move. The status guard on the update makes a
// concurrent duplicate (webhook + reconcile) a no-op, and the refund is written only by the winner.
export async function applyOutcome(postId: string, outcome: PublishOutcome): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const post = await tx.socialPost.findUnique({ where: { id: postId } });
    if (!post || !OPEN.includes(post.status)) return;
    const guard = { id: postId, status: post.status };
    const estimate = num(post.estimatedCostBrl);
    if (outcome.state === "published") {
      await tx.socialPost.updateMany({
        where: guard,
        data: { status: "PUBLISHED", providerPostId: outcome.providerPostId, url: outcome.url, publishedAt: new Date(), actualCostBrl: estimate, error: null },
      });
    } else if (outcome.state === "scheduled") {
      await tx.socialPost.updateMany({ where: guard, data: { status: "SCHEDULED", providerPostId: outcome.providerPostId } });
    } else if (outcome.state === "unknown") {
      await tx.socialPost.updateMany({ where: guard, data: { status: "UNKNOWN", error: UNKNOWN_COPY } });
    } else {
      const { count } = await tx.socialPost.updateMany({ where: guard, data: { status: "FAILED", error: FAILURE_COPY[outcome.reason] } });
      if (count !== 1) return;
      if (estimate > 0)
        await tx.ledgerEntry.create({
          data: { userId: post.userId, deltaBrl: estimate, reason: "REFUND", socialPostId: post.id, note: "Estorno: publicação não enviada" },
        });
      if (outcome.reason === "auth_expired")
        await tx.socialAccount.updateMany({ where: { id: post.accountId, status: "CONNECTED" }, data: { status: "EXPIRED" } });
    }
  });
}

export async function cancelPost(userId: string, postId: string): Promise<void> {
  const post = await prisma.socialPost.findFirst({ where: { id: postId, userId }, include: { account: true } });
  if (!post) throw new SocialError("Publicação não encontrada.");
  if (post.status !== "SCHEDULED") throw new SocialError("Só dá para cancelar publicações agendadas.");
  if (post.providerPostId) {
    // Scheduled at the backend: it must drop the post before we refund.
    try {
      const publisher = getPublisher(post.account.backend as Backend);
      if (post.account.backend === "bundle" && post.scheduledAt.getTime() <= Date.now()) {
        // Its time has come: the backend may already have published it. Ask before dropping anything.
        const outcome = await publisher.status({ account: await accountRef(post.accountId), providerPostId: post.providerPostId });
        if (outcome.state !== "scheduled") {
          await applyOutcome(post.id, outcome);
          throw new SocialError(
            outcome.state === "published" ? "Esta publicação já foi enviada e não pode mais ser cancelada." : "Não foi possível cancelar esta publicação.",
          );
        }
      }
      if (!publisher.cancel) throw new Error("No cancel");
      await publisher.cancel({ account: await accountRef(post.accountId), providerPostId: post.providerPostId });
    } catch (error) {
      if (error instanceof SocialError) throw error;
      throw new SocialError("Não foi possível cancelar esta publicação.");
    }
  }
  const estimate = num(post.estimatedCostBrl);
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.socialPost.updateMany({ where: { id: post.id, status: "SCHEDULED" }, data: { status: "CANCELED" } });
    if (count !== 1) throw new SocialError("Esta publicação já está sendo enviada e não pode ser cancelada.");
    if (estimate > 0)
      await tx.ledgerEntry.create({
        data: { userId, deltaBrl: estimate, reason: "REFUND", socialPostId: post.id, note: "Estorno: publicação cancelada" },
      });
  });
}

export async function disconnectAccount(userId: string, accountId: string): Promise<{ canceled: number }> {
  const account = await prisma.socialAccount.findFirst({ where: { id: accountId, userId } });
  if (!account) throw new SocialError("Conta não encontrada.");
  const scheduled = await prisma.socialPost.findMany({ where: { accountId, userId, status: "SCHEDULED" }, select: { id: true } });
  let canceled = 0;
  for (const post of scheduled) {
    try {
      await cancelPost(userId, post.id);
      canceled++;
    } catch {
      // Left SCHEDULED: dispatch fails it with a refund once the account is no longer CONNECTED.
    }
  }
  try {
    await getPublisher(account.backend as Backend).disconnect({ account: await accountRef(accountId) }); // best effort
  } catch {}
  await prisma.socialAccount.update({ where: { id: accountId }, data: { status: "DISCONNECTED", accessToken: null, refreshToken: null, tokenExpiresAt: null } });
  return { canceled };
}

export async function reconcileScheduled(userId: string): Promise<void> {
  const posts = await prisma.socialPost.findMany({
    where: { userId, status: "SCHEDULED", providerPostId: { not: null }, scheduledAt: { lte: new Date() } },
    include: { account: { select: { backend: true } } },
    take: 25,
  });
  for (const post of posts) {
    try {
      const outcome = await getPublisher(post.account.backend as Backend).status({
        account: await accountRef(post.accountId),
        providerPostId: post.providerPostId!,
      });
      await applyOutcome(post.id, outcome);
    } catch {
      // Try again on the next visit.
    }
  }
}
