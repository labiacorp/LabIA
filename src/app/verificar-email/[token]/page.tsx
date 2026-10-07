import { AuthShell } from "@/components/app/auth-shell";
import { Button } from "@/components/ui/button";
import { confirmEmailLink } from "../actions";

export const metadata = { title: "Confirmar e-mail · LabIA" };

export default async function ConfirmLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <AuthShell title="Confirmar e-mail" description="Toque no botão para confirmar que este e-mail é seu.">
    <form action={confirmEmailLink.bind(null, token)}><Button className="h-14 w-full text-body">Confirmar e-mail</Button></form>
  </AuthShell>;
}
