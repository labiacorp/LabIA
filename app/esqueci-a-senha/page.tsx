import type { Metadata } from "next";

import { ForgotForm } from "@/app/esqueci-a-senha/forgot-form";
import { AuthLink, AuthTitle } from "@/components/auth/auth-parts";
import { AuthShell } from "@/components/auth/auth-shell";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Esqueci a senha · LabIA" };

export default async function EsqueciASenhaPage({ searchParams }: { searchParams: Promise<{ link?: string }> }) {
  const { link } = await searchParams;

  return (
    <AuthShell>
      <AuthTitle title="Esqueci a senha">Informe o e-mail da conta. Enviamos um link para criar uma nova senha.</AuthTitle>
      {link === "invalido" ? (
        <div className="mt-4">
          <Alert variant="warning" title="O link venceu ou já foi usado">
            Peça um novo abaixo.
          </Alert>
        </div>
      ) : null}
      <ForgotForm />
      <p className="mt-[18px] text-center">
        <AuthLink href="/entrar">Voltar para entrar</AuthLink>
      </p>
    </AuthShell>
  );
}
