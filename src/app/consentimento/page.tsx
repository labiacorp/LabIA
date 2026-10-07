import { redirect } from "next/navigation";
import { AuthShell } from "@/components/app/auth-shell";
import { Button } from "@/components/ui/button";
import { needsConsent } from "@/lib/consent";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { logout } from "../(app)/actions";
import { ConsentForm } from "./consent-form";

export const metadata = { title: "Termos · LabIA" };

export default async function ConsentPage() {
  const userId = await requireUserId();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { createdAt: true, consentAcceptedAt: true } });
  if (!needsConsent(user)) redirect("/painel");
  return <AuthShell title="Antes de começar" description="Três combinados rápidos, todos obrigatórios.">
    <ConsentForm />
    <form action={logout}><Button type="submit" variant="ghost" className="w-full">Sair</Button></form>
  </AuthShell>;
}
