import Link from "next/link";
import { AuthShell } from "@/components/app/auth-shell";
import { ForgotForm } from "./forgot-form";

export const metadata = { title: "Esqueci minha senha · LabIA" };

export default function ForgotPasswordPage() {
  return <AuthShell title="Criar uma nova senha" description="Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.">
    <ForgotForm />
    <Link href="/login" className="text-body-sm text-lab-text-dim underline">Voltar para entrar</Link>
  </AuthShell>;
}
