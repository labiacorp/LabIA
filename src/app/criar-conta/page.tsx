import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, ownersOnly } from "@/auth";
import { googleConfigured } from "@/lib/auth-config";
import { emailEnabled } from "@/lib/email";
import { AuthShell } from "@/components/app/auth-shell";
import { Alert } from "@/components/ui/alert";
import { loginGoogle } from "../login/actions";
import { GoogleSignIn } from "../login/google-form";
import { PasswordSignup } from "../login/password-form";

export const metadata = { title: "Criar conta · LabIA" };

// Criar conta: one signup for everyone. Password signup needs e-mail on (it sends the confirmation link);
// Google creates the account directly. Terms come right after, on "Antes de começar".
export default async function SignupPage() {
  if ((await auth())?.user) redirect("/painel");
  const google = googleConfigured();
  const password = emailEnabled() && !ownersOnly();
  return (
    <AuthShell title="Criar conta" description="Crie sua conta e comece pela sua primeira influencer.">
      {password ? <PasswordSignup /> : null}
      {google ? <>{password ? <p className="text-center text-body-sm text-lab-text-dim">ou</p> : null}<GoogleSignIn action={loginGoogle} enabled /></> : null}
      {!password && !google ? <Alert variant="info" title="O cadastro abre em breve." /> : null}
      <p className="text-center text-body-sm text-lab-text-dim">Já tem conta? <Link href="/login" className="inline-flex min-h-11 items-center text-lab-text underline underline-offset-[3px]">Entrar</Link></p>
    </AuthShell>
  );
}
