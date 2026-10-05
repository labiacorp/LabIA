import Link from "next/link";
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
  return <AuthShell title="Antes de começar" description={<>Leia os <Link href="/termos" target="_blank" className="underline">Termos de Uso</Link> e a <Link href="/privacidade" target="_blank" className="underline">Política de Privacidade</Link> da LabIA. Eles explicam, entre outras coisas, o que você pode enviar como referência e o que acontece com seus arquivos.</>}>
    <ConsentForm />
    <form action={logout}><Button type="submit" variant="ghost" className="w-full">Sair</Button></form>
  </AuthShell>;
}
