import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { googleConfigured, loginErrorMessage } from "@/lib/auth-config";
import { emailEnabled } from "@/lib/email";
import { AuthShell } from "@/components/app/auth-shell";
import { Alert } from "@/components/ui/alert";
import { DevelopmentLogin } from "./dev-form";
import { PasswordLogin } from "./password-form";
import { loginGoogle } from "./actions";
import { GoogleSignIn } from "./google-form";
export const metadata = { title: "Entrar · LabIA" };
const notices: Record<string, string> = {
  verificado: "E-mail confirmado. Entre com sua senha.",
  "email-alterado": "E-mail alterado. Entre com o novo endereço.",
  "senha-redefinida": "Senha trocada. Entre com a nova senha.",
  "conta-excluida": "Sua conta foi excluída.",
};

// Entrar, the same page for everyone (design): e-mail and password, Google, and "Primeira vez? Criar conta".
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; aviso?: string }> }) {
  if ((await auth())?.user) redirect("/painel");
  const google = googleConfigured();
  const { error, aviso } = await searchParams;
  const message = loginErrorMessage(error);
  const notice = aviso ? notices[aviso] : undefined;
  return (
    <AuthShell title="Entrar">
      {message ? <Alert variant="error" title={message} /> : null}
      {notice ? <Alert variant="success" title={notice} /> : null}
      <PasswordLogin recover={emailEnabled()} />
      {google ? <><p className="text-center text-body-sm text-lab-text-dim">ou</p><GoogleSignIn action={loginGoogle} /></> : null}
      <p className="text-center text-body-sm text-lab-text-dim">Primeira vez? <Link href="/criar-conta" className="inline-flex min-h-11 items-center text-lab-text underline underline-offset-[3px]">Criar conta</Link></p>
      {process.env.NODE_ENV === "development" ? <DevelopmentLogin /> : null}
    </AuthShell>
  );
}
