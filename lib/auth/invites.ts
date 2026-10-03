import { createHash, randomBytes } from "node:crypto";
import { notFound } from "next/navigation";

import { getSessionPrincipal } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
// Versão do texto de Termos e Privacidade aceito no cadastro. Trocar quando o texto mudar.
export const CONSENT_VERSION = "2026-10-convite";

// Quem não é admin recebe o mesmo 404 de uma rota inexistente (o middleware já reescreve /admin).
export async function requireAdmin() {
  const principal = await getSessionPrincipal();
  if (!principal?.isAdmin) notFound();
  return principal;
}

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createInvite(input: { createdBy: string; email: string | null; workspaceId: string | null }) {
  const token = randomBytes(32).toString("base64url");
  await prisma.invite.create({
    data: { ...input, tokenHash: hashInviteToken(token), expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
  });
  return token;
}

// Convite que ainda abre /criar-conta. Usado, vencido, revogado (linha apagada) ou adulterado: null.
export async function findOpenInvite(token: unknown) {
  if (typeof token !== "string" || !token) return null;
  return prisma.invite.findFirst({
    where: { tokenHash: hashInviteToken(token), usedAt: null, expiresAt: { gt: new Date() } },
    include: { workspace: { select: { name: true } } },
  });
}

export type InviteState =
  | { status: "open"; invite: NonNullable<Awaited<ReturnType<typeof findOpenInvite>>> }
  | { status: "used" | "expired" | "invalid" };

// Para a tela explicar o motivo. O token tem 256 bits: saber que ele existiu não ajuda ninguém a adivinhar outro.
export async function getInviteState(token: unknown): Promise<InviteState> {
  if (typeof token !== "string" || !token) return { status: "invalid" };
  const invite = await prisma.invite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: { workspace: { select: { name: true } } },
  });
  if (!invite) return { status: "invalid" };
  if (invite.usedAt) return { status: "used" };
  if (invite.expiresAt <= new Date()) return { status: "expired" };
  return { status: "open", invite };
}

export class InviteTakenError extends Error {}

// Dá a uma conta recém-criada o workspace e o aceite dos Termos. Chamada pelo formulário e pelo retorno do Google:
// o gate é o mesmo nos dois. Sem inviteId (só com LABIA_SIGNUP_MODE=open), a pessoa ganha um workspace próprio.
// Convite: uso único, o update condicional é a trava (dois cadastros com o mesmo convite, só um passa).
// Quem já tem workspace (recadastro antes de confirmar, vínculo de conta) não gasta convite nem ganha outro workspace.
export async function provisionAccount(input: { userId: string; name: string; inviteId: string | null }) {
  await prisma.$transaction(async (tx) => {
    if (await tx.workspaceMember.findFirst({ where: { userId: input.userId }, select: { id: true } })) return;

    const now = new Date();
    let workspaceId: string | null = null;
    if (input.inviteId) {
      const claimed = await tx.invite.updateMany({
        where: { id: input.inviteId, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now, usedBy: input.userId },
      });
      if (claimed.count !== 1) throw new InviteTakenError("Convite já usado, vencido ou revogado.");
      workspaceId = (await tx.invite.findUniqueOrThrow({ where: { id: input.inviteId } })).workspaceId;
    }
    const joinsExisting = workspaceId !== null;
    // Workspace novo nasce com spendEnabled=false (padrão do schema): entrar não é gastar.
    workspaceId ??= (await tx.workspace.create({ data: { name: `Workspace de ${input.name}`, slug: `ws-${randomBytes(6).toString("hex")}` } })).id;

    await tx.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId, userId: input.userId } },
      update: {},
      create: { workspaceId, userId: input.userId, role: joinsExisting ? "MEMBER" : "OWNER" },
    });
    await tx.profile.upsert({
      where: { userId: input.userId },
      update: {},
      create: { userId: input.userId, consentAcceptedAt: now, consentVersion: CONSENT_VERSION },
    });
  });
}

// O que a pessoa lê quando o convite não abre. "Sem convite" só existe com o gate ligado.
export const INVITE_PROBLEM = {
  invalid: "Este convite não existe ou foi cancelado. Peça um novo a quem te convidou.",
  used: "Este convite já foi usado. Se foi você, é só entrar; se o e-mail de confirmação não chegou, peça outro.",
  expired: "Este convite venceu. Peça um novo a quem te convidou.",
  missing: "O cadastro está aberto só por convite. Peça um link a quem administra a LabIA.",
  taken: "Este convite acabou de ser usado por outra pessoa. Peça um novo.",
  otherEmail: "Este convite é para outro e-mail.",
} as const;

export const CONSENT_REQUIRED = "Aceite os Termos de Uso e a Política de Privacidade para continuar.";
