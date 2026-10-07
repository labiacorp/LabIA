import Link from "next/link";
import { redirect } from "next/navigation";
import { accessOpen, auth } from "@/auth";
import { gateMode, hasPass } from "@/lib/access";
import { admitted } from "@/lib/referrals";
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
  "senha-redefinida": "Senha criada. Entre com a nova senha.",
  "conta-excluida": "Sua conta foi excluída.",
};
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; aviso?: string }>;
}) {
  if ((await auth())?.user) redirect("/painel");
  // Closed to the public: the sign-in form exists only for whoever entered the team code at /acesso.
  // Without LABIA_ACCESS_CODE there is no way in (fails closed), and a referral link is not enough.
  if (!accessOpen()) {
    if (gateMode() !== "on" || !(await hasPass())) redirect("/");
  } else if (!(await admitted())) redirect("/acesso");
  const enabled = googleConfigured();
  const { error, aviso } = await searchParams;
  const message = loginErrorMessage(error);
  const notice = aviso ? notices[aviso] : undefined;
  return (
    <AuthShell title="Entrar" description={accessOpen() ? "Entre na sua conta." : "Acesso da equipe."}>
      {message ? <Alert variant="error" title={message} /> : null}
      {notice ? <Alert variant="success" title={notice} /> : null}
      <PasswordLogin signup={emailEnabled()} />
      <p className="text-center text-body-sm text-lab-text-dim">ou</p>
      <GoogleSignIn action={loginGoogle} enabled={enabled} />
      {!enabled ? (
        <Alert
          variant="info"
          title="O login com Google ainda está sendo preparado."
        >
          A equipe precisa concluir a configuração para liberar esta forma de
          acesso.
        </Alert>
      ) : null}
      {process.env.NODE_ENV === "development" ? <DevelopmentLogin /> : null}
      <p className="text-body-sm text-lab-text-dim">
        <Link href="/termos" className="underline">Termos de Uso</Link> · <Link href="/privacidade" className="underline">Política de Privacidade</Link>
      </p>
    </AuthShell>
  );
}
