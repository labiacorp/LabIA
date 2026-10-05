import Link from "next/link";
import { AuthShell } from "@/components/app/auth-shell";
import { Alert } from "@/components/ui/alert";
import { emailEnabled } from "@/lib/email";
import { ForgotForm } from "./forgot-form";

export const metadata = { title: "Esqueci minha senha · LabIA" };

export default function ForgotPasswordPage() {
  return <AuthShell title="Criar uma nova senha" description="Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.">
    {emailEnabled() ? <ForgotForm /> : <Alert variant="info" title="Ainda não disponível">A recuperação de senha por e-mail chega em breve. Por enquanto, fale com a equipe da LabIA.</Alert>}
    <Link href="/login" className="text-body-sm text-lab-text-dim underline">Voltar para entrar</Link>
  </AuthShell>;
}
