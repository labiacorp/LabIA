import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Ticket } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/actions";
import { getSessionPrincipal } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Acesso por convite · LabIA" };
export const dynamic = "force-dynamic";

export default async function SemAcessoPage() {
  const principal = await getSessionPrincipal();
  if (!principal) redirect("/entrar");
  if (principal.workspace) redirect("/fluxos");

  return (
    <AuthShell>
      <Ticket className="size-6 text-lab-text-dim" aria-hidden />
      <h1 className="mt-[18px] font-display text-[28px] font-bold leading-9 tracking-[-0.02em]">Sua conta ainda não tem acesso</h1>
      <p className="mt-3 text-sm leading-6 text-lab-text-dim">Você entrou como <span className="break-all text-lab-text">{principal.email}</span>, mas ainda não faz parte de nenhum workspace. Peça um convite a quem administra a LabIA.</p>
      <form action={signOutAction} className="mt-6"><Button type="submit" variant="secondary" size="lg" className="w-full">Sair</Button></form>
    </AuthShell>
  );
}
