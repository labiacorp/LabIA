import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ResetForm } from "@/app/redefinir-senha/reset-form";
import { AuthTitle } from "@/components/auth/auth-parts";
import { AuthShell } from "@/components/auth/auth-shell";
import { RECOVERY_COOKIE } from "@/lib/auth/recovery";

export const metadata: Metadata = { title: "Nova senha · LabIA" };
export const dynamic = "force-dynamic";

export default async function RedefinirSenhaPage() {
  // Só chega aqui quem abriu o link do e-mail de recuperação (o cookie nasce lá).
  if (!(await cookies()).get(RECOVERY_COOKIE)) redirect("/esqueci-a-senha");

  return (
    <AuthShell>
      <AuthTitle title="Nova senha">Escolha a nova senha da sua conta. Os outros aparelhos conectados vão sair.</AuthTitle>
      <ResetForm />
    </AuthShell>
  );
}
