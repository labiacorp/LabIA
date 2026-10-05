import Link from "next/link";
import { PageHeading } from "@/components/app/page-heading";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/owner";
import { currency, dateLabel } from "@/lib/platform";
import { ReconcileForm, TopUpForm } from "./admin-forms";

const PAGE = 50;
const actionLabels: Record<string, string> = { TOPUP: "Recarga", RECONCILE: "Reconciliação", ROLE_GRANT: "Acesso de owner concedido", ROLE_REVOKE: "Acesso de owner removido" };
function actionDetail(action: string, raw: unknown) {
  const data = (raw ?? {}) as Record<string, unknown>;
  if (action === "TOPUP") return `${currency(Number(data.amount))} · ${String(data.note ?? "")}`;
  if (action === "RECONCILE") return `custo ${currency(Number(data.actualBrl))} · ajuste ${currency(Number(data.adjustmentBrl))}`;
  return data.via ? `via ${String(data.via)}` : "";
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireOwner();
  const q = ((await searchParams).q ?? "").trim().slice(0, 100);
  const where = q ? { OR: [{ email: { contains: q, mode: "insensitive" as const } }, { name: { contains: q, mode: "insensitive" as const } }] } : {};
  const [users, total, uncertain, recent] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, take: PAGE, select: { id: true, email: true, name: true, role: true, createdAt: true, referredBy: { select: { email: true } } } }),
    prisma.user.count({ where }),
    prisma.step.findMany({ where: { submissionState: { in: ["submission_unknown", "cost_unknown"] } }, orderBy: { createdAt: "asc" }, take: 50, select: { id: true, kind: true, model: true, estimatedCostBrl: true, createdAt: true, influencer: { select: { name: true, user: { select: { email: true } } } }, content: { select: { title: true } } } }),
    prisma.adminAction.findMany({ orderBy: { createdAt: "desc" }, take: 20, select: { id: true, action: true, data: true, createdAt: true, targetUserId: true, actor: { select: { email: true } } } }),
  ]);
  const balances = new Map((await prisma.ledgerEntry.groupBy({ by: ["userId"], where: { userId: { in: users.map((u) => u.id) } }, _sum: { deltaBrl: true } })).map((row) => [row.userId, Number(row._sum.deltaBrl ?? 0)]));
  const emails = new Map((await prisma.user.findMany({ where: { id: { in: recent.flatMap((r) => r.targetUserId ?? []) } }, select: { id: true, email: true } })).map((u) => [u.id, u.email]));
  return <div className="mx-auto max-w-content">
    <PageHeading title="Admin" description="Contas, recargas manuais e gerações com custo a confirmar. Cada ação fica registrada abaixo." />
    <section className="mb-10" aria-labelledby="admin-accounts">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="admin-accounts" className="font-display text-xl">Contas</h2><span className="text-caption text-lab-text-muted">{users.length < total ? `${users.length} de ${total}` : `${total}`} {total === 1 ? "conta" : "contas"}</span></div>
      <form className="mb-4" role="search"><label className="sr-only" htmlFor="admin-search">Buscar conta</label><Input id="admin-search" name="q" defaultValue={q} placeholder="Buscar por e-mail ou nome" /></form>
      <ul className="divide-y divide-lab-border overflow-hidden rounded-lab border border-lab-border bg-lab-surface-1">{users.map((user) => <li key={user.id} className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="break-words text-body-sm font-medium">{user.name || user.email}{user.role === "OWNER" ? <Badge className="ml-2">Owner</Badge> : null}</p><p className="mt-1 break-words text-caption text-lab-text-dim">{user.name ? `${user.email} · ` : ""}desde {dateLabel(user.createdAt)}{user.referredBy ? ` · indicado por ${user.referredBy.email}` : ""}</p></div><span className="font-mono text-body-sm">{currency(balances.get(user.id) ?? 0)}</span></div>
        <details className="mt-2 text-body-sm"><summary className="cursor-pointer py-2 text-lab-text-dim">Adicionar saldo</summary><TopUpForm userId={user.id} email={user.email} /></details>
      </li>)}</ul>
    </section>
    <section className="mb-10" aria-labelledby="admin-uncertain">
      <h2 id="admin-uncertain" className="mb-2 font-display text-xl">Custos a confirmar</h2>
      <p className="mb-4 max-w-2xl text-body-sm leading-6 text-lab-text-dim">Gerações cujo envio ou custo final não pôde ser confirmado. A reserva continua retida até você informar o custo verificado no painel do provedor.</p>
      {uncertain.length ? <ul className="divide-y divide-lab-border overflow-hidden rounded-lab border border-lab-border bg-lab-surface-1">{uncertain.map((step) => <li key={step.id} className="p-5"><p className="break-words text-body-sm font-medium">{step.content?.title || step.influencer?.name || "Etapa"} · {step.kind}{step.model ? ` · ${step.model}` : ""}</p><p className="mt-1 break-words text-caption text-lab-text-dim">{step.influencer?.user.email} · reservado {currency(Number(step.estimatedCostBrl ?? 0))} · {dateLabel(step.createdAt)}</p><ReconcileForm stepId={step.id} video={step.kind === "VIDEO"} /></li>)}</ul> : <p className="text-body-sm text-lab-text-dim">Nenhuma geração aguardando confirmação.</p>}
    </section>
    <section aria-labelledby="admin-log">
      <h2 id="admin-log" className="mb-4 font-display text-xl">Registro</h2>
      {recent.length ? <ul className="divide-y divide-lab-border overflow-hidden rounded-lab border border-lab-border bg-lab-surface-1">{recent.map((entry) => <li key={entry.id} className="p-4 text-caption"><p className="text-body-sm">{actionLabels[entry.action] ?? entry.action}{entry.targetUserId ? ` · ${emails.get(entry.targetUserId) ?? "conta excluída"}` : ""}</p><p className="mt-1 break-words text-lab-text-dim">{entry.actor?.email ?? "terminal"} · {dateLabel(entry.createdAt)}{actionDetail(entry.action, entry.data) ? ` · ${actionDetail(entry.action, entry.data)}` : ""}</p></li>)}</ul> : <p className="text-body-sm text-lab-text-dim">Nenhuma ação registrada ainda.</p>}
    </section>
    <p className="mt-8 text-caption text-lab-text-muted"><Link href="/conta" className="underline">Voltar para a conta</Link></p>
  </div>;
}
