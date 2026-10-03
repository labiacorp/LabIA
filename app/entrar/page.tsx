import type { Metadata } from "next";

import { LoginForm } from "@/app/entrar/login-form";
import { AuthLink, AuthTitle, OrDivider } from "@/components/auth/auth-parts";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleLoginButton } from "@/components/auth/google-button";
import { Alert } from "@/components/ui/alert";
import { isGoogleAvailable } from "@/lib/auth/google-availability";
import { safeNextPath } from "@/lib/auth/next-path";
import { isSignupOpen } from "@/lib/auth/signup-mode";

export const metadata: Metadata = { title: "Entrar · LabIA" };

// O que a pessoa lê quando o retorno do Google ou o link de confirmação não deu certo.
const ERRORS: Record<string, string> = {
  google: "Não foi possível entrar com o Google. Tente de novo.",
  unverified: "O Google não confirmou o seu e-mail, então não podemos criar a conta por ele. Use um e-mail e uma senha.",
  invite: "Esta conta ainda não existe e o cadastro é só por convite. Abra o link do convite e escolha Continuar com Google na tela Criar conta.",
  "invite-taken": "Este convite acabou de ser usado por outra pessoa. Peça um novo.",
  "invite-email": "Este convite é para outro e-mail. Entre com o Google desse e-mail.",
  consent: "Para criar a conta com o Google, aceite os Termos na tela Criar conta e use o botão de lá.",
};

export default async function EntrarPage({ searchParams }: { searchParams: Promise<{ next?: string; link?: string; erro?: string }> }) {
  const { next, link, erro } = await searchParams;
  const safeNext = safeNextPath(next);
  const problem = erro ? ERRORS[erro] : null;

  return (
    <AuthShell>
      <AuthTitle title="Entrar">De volta à bancada.</AuthTitle>
      {link === "invalido" ? (
        <div className="mt-4">
          <Alert variant="warning" title="O link de confirmação venceu ou já foi usado">
            Se a conta já está confirmada, é só entrar. Se não, peça outro e-mail de confirmação.
          </Alert>
        </div>
      ) : null}
      {problem ? (
        <div className="mt-4">
          <Alert variant="error" title={problem} />
        </div>
      ) : null}
      <LoginForm next={safeNext} />
      {(await isGoogleAvailable()) ? (
        <div className="mt-[18px] grid gap-[18px]">
          <OrDivider />
          <GoogleLoginButton next={safeNext} />
        </div>
      ) : null}
      <p className="mt-[18px] text-center text-body-sm leading-5 text-lab-text-dim">
        {isSignupOpen() ? "Ainda não tem conta? " : "Acesso só por convite. "}
        <AuthLink href="/criar-conta">{isSignupOpen() ? "Criar conta" : "Tenho um convite"}</AuthLink>
      </p>
    </AuthShell>
  );
}
