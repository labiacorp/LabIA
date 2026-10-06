import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPass } from "@/lib/access";
import { googleConfigured, loginErrorMessage } from "@/lib/auth-config";
import { emailEnabled } from "@/lib/email";
import { AuthShell } from "@/components/app/auth-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DevelopmentLogin } from "./dev-form";
import { PasswordLogin } from "./password-form";
import { loginGoogle } from "./actions";
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
  if (!(await hasPass())) redirect("/acesso");
  const enabled = googleConfigured();
  const { error, aviso } = await searchParams;
  const message = loginErrorMessage(error);
  const notice = aviso ? notices[aviso] : undefined;
  return (
    <AuthShell title="Entrar" description="Cada geração mostra o custo antes de você confirmar. Pague só pelo que usar.">
      {message ? <Alert variant="error" title={message} /> : null}
      {notice ? <Alert variant="success" title={notice} /> : null}
      <PasswordLogin signup={emailEnabled()} />
      <p className="text-center text-body-sm text-lab-text-dim">ou</p>
      <form action={loginGoogle}>
        <Button
          size="lg"
          variant="secondary"
          disabled={!enabled}
          className="w-full"
        >
          <span
            aria-hidden
            className="flex size-5 items-center justify-center rounded-full bg-lab-text text-xs font-bold text-lab-bg"
          >
            G
          </span>
          Continuar com Google
        </Button>
      </form>
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
        Beta fechada · use a conta que recebeu acesso.
      </p>
      <p className="text-body-sm text-lab-text-dim">
        <Link href="/termos" className="underline">Termos de Uso</Link> · <Link href="/privacidade" className="underline">Política de Privacidade</Link>
      </p>
    </AuthShell>
  );
}
