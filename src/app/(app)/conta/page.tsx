import Link from "next/link";
import { PageHeading } from "@/components/app/page-heading";
import { Button, buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { dateLabel } from "@/lib/platform";
import { logout } from "../actions";
import { AccountForm } from "./account-form";

export default async function AccountPage() {
  const userId = await requireUserId();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true, createdAt: true } });
  return <div className="mx-auto max-w-content"><PageHeading title="Minha conta" description="Seu perfil, acesso e informações da conta em um só lugar." /><div className="grid gap-5 md:grid-cols-2"><section className="rounded-lab border border-lab-border bg-lab-surface-1 p-6"><h2 className="mb-5 font-display text-xl">Seu perfil</h2><AccountForm name={user.name} /><dl className="mt-6 grid gap-4 border-t border-lab-border pt-5 text-body-sm"><div><dt className="text-lab-text-muted">E-mail da conta</dt><dd className="mt-1 break-all">{user.email}</dd></div><div><dt className="text-lab-text-muted">Na LabIA desde</dt><dd className="mt-1">{dateLabel(user.createdAt)}</dd></div></dl></section><div className="grid content-start gap-5"><section className="rounded-lab border border-lab-border bg-lab-surface-1 p-6"><h2 className="font-display text-xl">Acesso</h2><p className="my-4 text-body-sm leading-6 text-lab-text-dim">Seu acesso é pessoal. Ao sair, será necessário entrar novamente para acessar seus personagens e conteúdos.</p><form action={logout}><Button variant="secondary" size="lg">Sair da conta</Button></form></section><section className="rounded-lab border border-lab-border bg-lab-surface-1 p-6"><h2 className="font-display text-xl">Seus custos</h2><p className="my-4 text-body-sm leading-6 text-lab-text-dim">A criação de rascunhos é gratuita. Cada geração mostra uma estimativa em reais antes da confirmação.</p><Link href="/saldo" className={buttonVariants({ variant: "secondary", size: "lg" })}>Ver saldo e extrato</Link></section></div></div></div>;
}
