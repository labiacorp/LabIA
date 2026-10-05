import { AuthShell } from "@/components/app/auth-shell";
import { Alert } from "@/components/ui/alert";
import { CodeForm, ResendForm } from "./forms";

export const metadata = { title: "Confirme seu e-mail · LabIA" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string; invalido?: string }> }) {
  const { email = "", invalido } = await searchParams;
  return <AuthShell title="Confirme seu e-mail" description={email ? <>Enviamos um link e um código de 6 números para <strong className="break-all text-lab-text">{email}</strong>. Use qualquer um dos dois.</> : "Digite o código que enviamos ou abra o link do e-mail."}>
    {invalido ? <Alert variant="error" title={invalido === "em-uso" ? "Este e-mail passou a ser usado por outra conta." : "Este link já foi usado ou expirou."}>{invalido === "em-uso" ? "Escolha outro e-mail na sua conta." : "Peça um novo abaixo."}</Alert> : null}
    <CodeForm email={email} />
    <ResendForm email={email} />
  </AuthShell>;
}
