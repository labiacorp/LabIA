import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CodeForm, ResendForm } from "@/app/criar-conta/sign-up-form";
import { AuthLink, AuthTitle } from "@/components/auth/auth-parts";
import { AuthShell } from "@/components/auth/auth-shell";
import { readSignupEmail } from "@/lib/auth/signup-email";

export const metadata: Metadata = { title: "Confirmar e-mail · LabIA" };
export const dynamic = "force-dynamic";

export default async function CodigoPage() {
  const email = await readSignupEmail();
  // Sem cadastro em andamento (ou passou de 30 min): o link do e-mail ainda funciona; aqui não há o que fazer.
  if (!email) redirect("/entrar");

  return (
    <AuthShell>
      <AuthTitle title="Confirme seu e-mail">
        Se o e-mail <span className="text-lab-text">{email}</span> pode receber uma conta, ele já está a caminho. Clique no link ou digite aqui o
        código de 6 números. Vale por 30 minutos.
      </AuthTitle>
      <CodeForm email={email} />
      <div className="mt-6 grid gap-3 border-t border-lab-border pt-5">
        <p className="text-body-sm text-lab-text-dim">Não chegou? Olhe o spam ou peça outro.</p>
        <ResendForm email={email} />
      </div>
      <p className="mt-[18px] text-center">
        <AuthLink href="/entrar">Voltar para entrar</AuthLink>
      </p>
    </AuthShell>
  );
}
