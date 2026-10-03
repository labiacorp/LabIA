import { prisma } from "@/lib/db/prisma";

// Consultas diretas ao schema auth do Supabase (o Prisma entra como postgres). Só leitura.

// Conta criada só pelo Google não tem senha. Chamado só depois de uma senha recusada, para o login dizer o caminho.
// Revela que o e-mail existe e é do Google: o limite de tentativas e o bloqueio seguram a enumeração.
export async function isGoogleOnlyAccount(email: string) {
  const rows = await prisma.$queryRaw<{ google_only: boolean }[]>`
    SELECT (COALESCE(encrypted_password, '') = '' AND raw_app_meta_data->'providers' @> '"google"'::jsonb) AS google_only
    FROM auth.users WHERE lower(email) = ${email} LIMIT 1`;
  return rows[0]?.google_only === true;
}

// Cadastro simultâneo do mesmo e-mail: o perdedor recebe um erro 500 sem código do Supabase. Se o usuário existe
// agora, foi a corrida (mesma resposta de "e-mail que já tem conta"); se não existe, é falha de verdade.
export async function authUserExists(email: string) {
  const rows = await prisma.$queryRaw<{ found: number }[]>`SELECT 1 AS found FROM auth.users WHERE lower(email) = ${email} LIMIT 1`;
  return rows.length === 1;
}

// null: no account. false: account waiting for e-mail confirmation. true: confirmed.
export async function authUserConfirmed(email: string) {
  const rows = await prisma.$queryRaw<{ confirmed: boolean }[]>`
    SELECT email_confirmed_at IS NOT NULL AS confirmed FROM auth.users WHERE lower(email) = ${email} LIMIT 1`;
  return rows.length ? rows[0].confirmed : null;
}
