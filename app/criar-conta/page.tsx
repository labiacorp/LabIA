import type { Metadata } from "next";

import { SignUpForm } from "@/app/criar-conta/sign-up-form";
import { AuthLink, AuthTitle } from "@/components/auth/auth-parts";
import { AuthShell } from "@/components/auth/auth-shell";
import { Alert } from "@/components/ui/alert";
import { isGoogleAvailable } from "@/lib/auth/google-availability";
import { getInviteState, INVITE_PROBLEM } from "@/lib/auth/invites";
import { isSignupOpen } from "@/lib/auth/signup-mode";

export const metadata: Metadata = { title: "Criar conta · LabIA" };
export const dynamic = "force-dynamic";

export default async function CriarContaPage({ searchParams }: { searchParams: Promise<{ convite?: string }> }) {
  const { convite } = await searchParams;
  const open = isSignupOpen();
  const state = convite ? await getInviteState(convite) : null;
  const closed = state && state.status !== "open" ? state : null;

  // Com o gate ligado, só um convite que abre leva ao formulário. Com o cadastro aberto, a pessoa também entra sem convite.
  if (closed || (!state && !open)) {
    const problem = closed ? INVITE_PROBLEM[closed.status] : INVITE_PROBLEM.missing;
    return (
      <AuthShell>
        <AuthTitle title={closed ? "Convite indisponível" : "Cadastro por convite"} />
        <div className="mt-4">
          <Alert variant={closed ? "error" : "info"} title={problem} />
        </div>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
          <AuthLink href="/entrar">Já tenho conta: entrar</AuthLink>
          {closed?.status === "used" ? <AuthLink href="/criar-conta/reenviar">Reenviar confirmação</AuthLink> : null}
          {open ? <AuthLink href="/criar-conta">Criar conta sem convite</AuthLink> : null}
        </div>
      </AuthShell>
    );
  }

  const invite = state?.status === "open" ? state.invite : null;
  return (
    <AuthShell>
      <AuthTitle title="Criar conta na LabIA">
        {invite?.workspace
          ? `Você vai entrar no workspace ${invite.workspace.name}.`
          : "Você vai ganhar um workspace próprio."}{" "}
        Depois de criar a conta, confirme o e-mail pelo link ou pelo código que vamos enviar.
      </AuthTitle>
      <SignUpForm invite={invite ? convite! : null} lockedEmail={invite?.email ?? null} googleEnabled={await isGoogleAvailable()} />
      <p className="mt-[18px] text-center text-body-sm text-lab-text-dim">
        Já tem conta? <AuthLink href="/entrar">Entrar</AuthLink>
      </p>
    </AuthShell>
  );
}
