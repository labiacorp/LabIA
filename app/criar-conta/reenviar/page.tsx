import type { Metadata } from "next";

import { ResendForm } from "@/app/criar-conta/sign-up-form";
import { AuthLink, AuthTitle } from "@/components/auth/auth-parts";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Reenviar confirmação · LabIA" };

export default function ReenviarPage() {
  return (
    <AuthShell>
      <AuthTitle title="Reenviar confirmação">Informe o e-mail do cadastro. Enviamos um link e um código novos.</AuthTitle>
      <div className="mt-6">
        <ResendForm />
      </div>
      <p className="mt-[18px] text-center">
        <AuthLink href="/entrar">Voltar para entrar</AuthLink>
      </p>
    </AuthShell>
  );
}
