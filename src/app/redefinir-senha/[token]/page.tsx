import Link from "next/link";
import { AuthShell } from "@/components/app/auth-shell";
import { ResetForm } from "./reset-form";

export const metadata = { title: "Nova senha · LabIA" };

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <AuthShell title="Nova senha">
    <ResetForm token={token} />
    <Link href="/esqueci-senha" className="flex min-h-11 items-center justify-center text-body-sm underline underline-offset-[3px]">Pedir novo link</Link>
  </AuthShell>;
}
