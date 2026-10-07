import Link from "next/link";
import { Mail } from "lucide-react";
import { AuthShell } from "@/components/app/auth-shell";
import { Alert } from "@/components/ui/alert";
import { CodeForm, ResendForm } from "./forms";

export const metadata = { title: "Confirme seu e-mail · LabIA" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string; invalido?: string }> }) {
  const { email = "", invalido } = await searchParams;
  return <AuthShell icon={<span className="flex size-[52px] items-center justify-center rounded-control bg-lab-surface-2"><Mail className="size-6" aria-hidden /></span>} title="Confira seu e-mail" description={email ? <>Mandamos um link e um código de 6 números para <strong className="break-all text-lab-text">{email}</strong>. Pode levar até 2 minutos. Olhe também o spam.</> : "Digite o código que enviamos ou abra o link do e-mail."}>
    {invalido ? <Alert variant="error" title={invalido === "em-uso" ? "Este e-mail passou a ser usado por outra conta." : "Este link já foi usado ou expirou."}>{invalido === "em-uso" ? "Escolha outro e-mail na sua conta." : "Peça um novo abaixo."}</Alert> : null}
    <CodeForm email={email} />
    <ResendForm email={email} />
    <Link href="/criar-conta" className="flex min-h-11 items-center justify-center text-body-sm underline underline-offset-[3px]">Errei o e-mail</Link>
  </AuthShell>;
}
