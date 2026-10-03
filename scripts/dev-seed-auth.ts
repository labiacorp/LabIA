import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

import { prisma } from "../lib/db/prisma";

loadEnvConfig(process.cwd());

// Contas de teste do Supabase LOCAL (npx supabase start). Senha conhecida de propósito: nunca em produção.
const LOCAL_TEST_PASSWORD = "labia-local-123";

const TEST_USERS = [
  // Mesmo e-mail de LABIA_BOOTSTRAP_OWNER_EMAIL no .env.local: vira owner do workspace padrão no 1º login.
  { email: "dono@labia.test", name: "Dono Local" },
  { email: "outro@labia.test", name: "Outra Pessoa", workspace: { name: "Workspace B (teste)", slug: "teste-b" } },
  { email: "semconvite@labia.test", name: "Sem Convite" },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const host = url ? new URL(url).hostname : "";
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error(`Recusado: NEXT_PUBLIC_SUPABASE_URL não é local (${host || "vazio"}).`);
  }

  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: existing, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  for (const testUser of TEST_USERS) {
    let user = existing.users.find((candidate) => candidate.email === testUser.email);
    if (!user) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: testUser.email,
        password: LOCAL_TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: testUser.name },
      });
      if (error) throw error;
      user = data.user;
    }

    if (testUser.workspace) {
      const workspace = await prisma.workspace.upsert({
        where: { slug: testUser.workspace.slug },
        update: {},
        create: testUser.workspace,
      });
      await prisma.workspaceMember.upsert({
        where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
        update: {},
        create: { workspaceId: workspace.id, userId: user.id, role: "OWNER" },
      });
    }

    console.log(`ok ${testUser.email}`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
