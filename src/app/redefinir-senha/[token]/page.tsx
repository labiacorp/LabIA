import Link from "next/link";
import { AuthShell } from "@/components/app/auth-shell";
import { ResetForm } from "./reset-form";

export const metadata = { title: "Nova senha · LabIA" };

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <AuthShell title="Nova senha" description="Escolha a senha que você vai usar para entrar. Ao salvar, todas as sessões abertas são encerradas.">
    <ResetForm token={token} />
    <Link href="/esqueci-senha" className="text-body-sm text-lab-text-dim underline">Pedir um novo link</Link>
  </AuthShell>;
}
