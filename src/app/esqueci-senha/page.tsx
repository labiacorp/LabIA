import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthShell } from "@/components/app/auth-shell";
import { Alert } from "@/components/ui/alert";
import { emailEnabled } from "@/lib/email";
import { ForgotForm } from "./forgot-form";

export const metadata = { title: "Esqueci a senha · LabIA" };

export default function ForgotPasswordPage() {
  return <AuthShell title="Esqueci a senha">
    {emailEnabled() ? <ForgotForm /> : <Alert variant="info" title="Ainda não disponível">A recuperação de senha por e-mail chega em breve. Entre com o Google enquanto isso.</Alert>}
    <Link href="/login" className="flex min-h-11 items-center justify-center gap-1.5 text-body-sm underline underline-offset-[3px]"><ArrowLeft className="size-[15px]" aria-hidden />Voltar para entrar</Link>
  </AuthShell>;
}
