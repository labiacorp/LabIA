import { PageHeading } from "@/components/app/page-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { getBalanceBrl } from "@/lib/ledger";
import { currency, dateLabel } from "@/lib/platform";

export default async function BalancePage() {
  const userId = await requireUserId();
  const [balance, entries] = await Promise.all([getBalanceBrl(userId), prisma.ledgerEntry.findMany({ where: { userId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100, include: { step: { select: { content: { select: { title: true } }, influencer: { select: { name: true } } } } } })]);
  const labels = { TOPUP: "Crédito adicionado", SPEND: "Reserva para geração", REFUND: "Devolução de reserva" };
  return <div className="mx-auto max-w-content"><PageHeading title="Saldo e extrato" description="Acompanhe os créditos, reservas e devoluções da sua conta." /><section className="mb-8 rounded-lab border border-lab-border bg-lab-surface-1 p-6"><p className="text-body-sm text-lab-text-dim">Saldo disponível</p><p className="mt-3 font-display text-4xl text-lab-reagent-bright">{currency(balance)}</p><p className="mt-4 max-w-2xl text-body-sm leading-6 text-lab-text-dim">Na beta, os créditos são adicionados pela equipe LabIA. Reservas são descontadas ao confirmar uma geração; diferenças são devolvidas após a apuração do custo.</p></section><h2 className="mb-4 font-display text-xl">Movimentações recentes</h2>{entries.length ? <div className="overflow-hidden rounded-lab border border-lab-border bg-lab-surface-1"><ul className="divide-y divide-lab-border">{entries.map((entry) => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 p-5"><div className="min-w-0"><p className="text-body-sm font-medium">{labels[entry.reason]}</p><p className="mt-1 break-words text-caption text-lab-text-dim">{entry.step?.content?.title || entry.step?.influencer?.name || "Conta LabIA"} · {dateLabel(entry.createdAt)}</p></div><span className="font-mono text-body-sm">{Number(entry.deltaBrl) > 0 ? "+" : ""}{currency(Number(entry.deltaBrl))}</span></li>)}</ul>{entries.length === 100 ? <p className="border-t border-lab-border p-4 text-caption text-lab-text-muted">Exibindo as 100 movimentações mais recentes.</p> : null}</div> : <EmptyState title="Sem movimentações ainda" description="Seus créditos e custos aparecerão aqui quando houver uma movimentação. Criar rascunhos não consome saldo." />}</div>;
}
