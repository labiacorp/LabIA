import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

import { ensureDefaultWorkspace } from "@/lib/db/default-workspace";
import { prisma } from "@/lib/db/prisma";

export type SessionPrincipal = {
  userId: string;
  email: string;
  name: string;
  // Dono das conexões pessoais. O dono do bootstrap mantém LABIA_LOCAL_OWNER_ID
  // para o executor local e os scripts do Felipe seguirem iguais (decisoes.md).
  ownerId: string;
  workspace: { id: string; name: string; role: "OWNER" | "MEMBER" } | null;
  isAdmin: boolean;
};

export class AccessError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = "AccessError";
  }
}

export function getSupabaseAuthEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export async function createSupabaseServerClient() {
  const env = getSupabaseAuthEnv();
  if (!env) throw new Error("NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY não estão configuradas.");
  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server Component não grava cookie; o middleware renova a sessão.
        }
      },
    },
  });
}

// LABIA_ADMIN_EMAILS (separados por vírgula), sempre com e-mail confirmado: abre /admin.
export function isAdminUser(user: Pick<User, "email" | "email_confirmed_at">) {
  const admins = (process.env.LABIA_ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  return Boolean(user.email && user.email_confirmed_at && admins.includes(user.email.toLowerCase()));
}

function isBootstrapOwner(user: User) {
  const bootstrapEmail = process.env.LABIA_BOOTSTRAP_OWNER_EMAIL?.trim().toLowerCase();
  // E-mail confirmado: sem isso, alguém criaria uma conta com o e-mail do Felipe e herdaria o workspace.
  return Boolean(bootstrapEmail && user.email?.toLowerCase() === bootstrapEmail && user.email_confirmed_at);
}

async function findMembership(userId: string) {
  return prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { workspace: { select: { id: true, name: true } } },
  });
}

// Primeiro login do Felipe: vira owner do workspace que já existe, com todos os dados.
// Fica aqui, e não na tela de login, para valer em qualquer caminho de entrada (Google, convite).
async function ensureBootstrapMembership(user: User) {
  if (!isBootstrapOwner(user)) return null;
  const workspace = await ensureDefaultWorkspace();
  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: {},
    create: { workspaceId: workspace.id, userId: user.id, role: "OWNER" },
  });
  return findMembership(user.id);
}

// Ponto único de "esta conta tem workspace?": usado pela sessão e pelo middleware (403 nas APIs).
export async function resolveMembership(user: User) {
  return (await findMembership(user.id)) ?? (await ensureBootstrapMembership(user));
}

export function displayName(user: User) {
  const metadataName = user.user_metadata?.full_name ?? user.user_metadata?.name;
  return typeof metadataName === "string" && metadataName.trim() ? metadataName.trim() : user.email!.split("@")[0];
}

// getUser() consulta o Supabase a cada chamada: pega sessão revogada na hora ("Sair de todos").
// ponytail: uma ida ao Supabase por chamada fora de Server Component; trocar leituras por getClaims() se pesar.
export const getSessionPrincipal = cache(async (): Promise<SessionPrincipal | null> => {
  if (!getSupabaseAuthEnv()) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.email) return null;

  const membership = await resolveMembership(user);

  return {
    userId: user.id,
    email: user.email,
    name: displayName(user),
    ownerId: isBootstrapOwner(user) ? process.env.LABIA_LOCAL_OWNER_ID?.trim() || user.id : user.id,
    workspace: membership
      ? { id: membership.workspace.id, name: membership.workspace.name, role: membership.role }
      : null,
    isAdmin: isAdminUser(user),
  };
});

export async function requireSessionScope() {
  const principal = await getSessionPrincipal();
  if (!principal) throw new AccessError(401, "Faça login para continuar.");
  if (!principal.workspace) throw new AccessError(403, "Sua conta ainda não tem acesso a um workspace.");
  return { workspaceId: principal.workspace.id, ownerId: principal.ownerId };
}
