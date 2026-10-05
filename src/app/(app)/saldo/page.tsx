import Link from "next/link";
import { PageHeading } from "@/components/app/page-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { getBalanceBrl } from "@/lib/ledger";
import { currency, dateLabel } from "@/lib/platform";

export default async function BalancePage({ searchParams }: { searchParams: Promise<{page?: string}> }) {
  const userId = await requireUserId();
  const requested = Number((await searchParams).page);
  const [balance, count] = await Promise.all([getBalanceBrl(userId), prisma.ledgerEntry.count({where:{userId}})]);
  const pages = Math.max(1, Math.ceil(count / 25));
  const page = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested,pages) : 1;
  const entries = await prisma.ledgerEntry.findMany({ where: { userId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip:(page-1)*25, take: 25, include: { step: { select: { content: { select: { title: true } }, influencer: { select: { name: true } } } } } });
  const labels = { TOPUP: "Crédito adicionado", SPEND: "Reserva para geração", REFUND: "Devolução de reserva" };
  return <div className="mx-auto max-w-content"><PageHeading title="Saldo e extrato" description="Seus créditos e o histórico de uso, em um só lugar." /><section className="workspace-panel mb-8"><p className="text-body-sm text-lab-text-dim">Disponível para criar</p><p className="mt-3 font-display text-4xl text-lab-reagent-bright">{currency(balance)}</p><details className="mt-4 max-w-2xl text-body-sm text-lab-text-dim"><summary className="cursor-pointer py-2">Como o saldo funciona</summary><p className="mt-2 leading-6">Na beta, os créditos são adicionados pela equipe. Cada geração reserva o valor confirmado por você. A diferença é devolvida após a confirmação do custo final; apurações pendentes mantêm a reserva.</p></details></section><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl">Movimentações</h2>{count > 0 && <span className="text-caption text-lab-text-muted">Página {page} de {pages}</span>}</div>{entries.length ? <><div className="overflow-hidden rounded-lab border border-lab-border bg-lab-surface-1"><ul className="divide-y divide-lab-border">{entries.map((entry) => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 p-5"><div className="min-w-0"><p className="text-body-sm font-medium">{labels[entry.reason]}</p><p className="mt-1 break-words text-caption text-lab-text-dim">{entry.step?.content?.title || entry.step?.influencer?.name || "Conta LabIA"} · {dateLabel(entry.createdAt)}</p></div><span className={`font-mono text-body-sm ${Number(entry.deltaBrl)>0 ? "text-lab-success" : "text-lab-text"}`}>{Number(entry.deltaBrl) > 0 ? "+" : ""}{currency(Number(entry.deltaBrl))}</span></li>)}</ul></div>{pages > 1 && <nav aria-label="Páginas do extrato" className="mt-5 flex justify-between gap-3">{page > 1 ? <Link href={`/saldo?page=${page-1}`} className={buttonVariants({variant:"secondary"})}>Anterior</Link> : <span />}{page < pages && <Link href={`/saldo?page=${page+1}`} className={buttonVariants({variant:"secondary"})}>Próxima</Link>}</nav>}</> : <EmptyState title="Seu histórico começa na primeira geração" description="Criar personagens e rascunhos é gratuito. As movimentações aparecerão aqui quando você usar créditos." action={<Link href="/" className={buttonVariants({variant:"secondary"})}>Explorar estúdio</Link>} />}</div>;
}
