import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPass } from "@/lib/access";
import { googleConfigured, loginErrorMessage } from "@/lib/auth-config";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DevelopmentLogin } from "./dev-form";
import { PasswordLogin } from "./password-form";
import { loginGoogle } from "./actions";
export const metadata = { title: "Entrar · LabIA" };
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if ((await auth())?.user) redirect("/painel");
  if (!(await hasPass())) redirect("/acesso");
  const enabled = googleConfigured();
  const message = loginErrorMessage((await searchParams).error);
  return (
    <main className="mx-auto flex min-h-screen max-w-form flex-col justify-center gap-6 px-5 py-8">
      <div>
        <p className="lab-wordmark text-h1">
          Lab<span>IA</span>
        </p>
        <h1 className="mt-6 font-display text-h2">Entre no seu laboratório</h1>
        <p className="mt-3 text-body-sm leading-6 text-lab-text-dim">
          Seus personagens, produções e arquivos em um só lugar. Cada geração
          mostra o custo antes de você confirmar.
        </p>
      </div>
      {message ? <Alert variant="error" title={message} /> : null}
      <PasswordLogin />
      <p className="text-center text-caption text-lab-text-muted">ou</p>
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
      <p className="text-caption text-lab-text-muted">
        Beta fechada · use a conta que recebeu acesso.
      </p>
    </main>
  );
}
