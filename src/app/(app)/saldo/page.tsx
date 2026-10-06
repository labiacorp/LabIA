import Link from "next/link";
import { activePlan, stripeConfigured } from "@/lib/stripe";
import { openBillingPortal, startSubscription } from "./subscribe";
import { PageHeading } from "@/components/app/page-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { getBalanceBrl, getFalCreditsUsd } from "@/lib/ledger";
import { videoUsdBrlRate } from "@/lib/video-options";
import { estimateReel } from "@/lib/content-plan";
import { currency, dateLabel } from "@/lib/platform";
import { balanceCredits, costCredits, creditsText, PLAN_CREDITS, planPriceText } from "@/lib/plan";

type Entry = { reason: "TOPUP" | "SPEND" | "REFUND" | "REFERRAL"; note: string | null };
function entryLabel({ reason, note }: Entry) {
  if (reason === "TOPUP") return note?.startsWith("stripe:in_") ? "Créditos do mês" : note?.startsWith("stripe:") ? "Recarga no cartão" : "Créditos da equipe";
  return { SPEND: "Reservado para gerar", REFUND: "Devolvido", REFERRAL: "Bônus de indicação" }[reason];
}

export default async function CreditsPage({ searchParams }: { searchParams: Promise<{ page?: string; assinado?: string; erro?: string }> }) {
  const userId = await requireUserId();
  const query = await searchParams;
  const requested = Number(query.page);
  const [balance, count, plan] = await Promise.all([getBalanceBrl(userId), prisma.ledgerEntry.count({ where: { userId } }), activePlan(userId)]);
  const pages = Math.max(1, Math.ceil(count / 25));
  const page = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, pages) : 1;
  const entries = await prisma.ledgerEntry.findMany({ where: { userId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 25, take: 25, include: { step: { select: { content: { select: { title: true } }, influencer: { select: { name: true } } } } } });
  const falUsd = balance === Infinity ? await getFalCreditsUsd() : undefined;
  const reels = Math.floor(PLAN_CREDITS / Math.max(1, costCredits(estimateReel().totalBrl)));
  const big = "font-display text-[clamp(56px,9vw,88px)] font-black uppercase leading-[.85] text-lab-reagent-bright";
  return <div className="mx-auto flex max-w-content flex-col gap-8 [&>div:first-child]:mb-0">
    <PageHeading title="Plano e créditos" description="Quanto você ainda pode gerar e para onde foi cada crédito." />
    <section className="flex flex-col gap-3 rounded-sheet bg-lab-surface-1 p-6 shadow-[inset_0_0_0_1px_var(--lab-border)] md:p-8">
      {falUsd === undefined ? <>
        <span className="text-body-sm text-lab-text-dim">Disponível para gerar</span>
        <p className={big}>{balanceCredits(balance).toLocaleString("pt-BR")}</p>
        <span className="text-body-sm text-lab-text-dim">{balanceCredits(balance) === 1 ? "crédito" : "créditos"}</span>
      </> : <>
        <span className="text-body-sm text-lab-text-dim">Conta da equipe: gera sem créditos. Crédito real na fal.ai:</span>
        <p className={big}>{falUsd === null ? "Indisponível" : falUsd.toLocaleString("en-US", { style: "currency", currency: "USD" })}</p>
        {falUsd !== null && <p className="font-mono text-body-sm text-lab-text-dim">≈ {currency(falUsd * videoUsdBrlRate())}</p>}
      </>}
    </section>
    {query.assinado ? <p role="status" className="rounded-lab border-[1.5px] border-lab-border-strong bg-lab-surface-1 p-4 text-body-sm">Assinatura confirmada. Os créditos do mês entram em instantes; se não aparecerem em um minuto, recarregue a página.</p> : null}
    {query.erro ? <p role="alert" className="rounded-lab border-[1.5px] border-lab-danger-line bg-lab-danger-dim p-4 text-body-sm">Não foi possível abrir a assinatura agora. Tente de novo em instantes.</p> : null}
    {falUsd === undefined ? <section className="flex flex-col gap-4 rounded-card bg-lab-surface-1 p-6 shadow-[inset_0_0_0_1px_var(--lab-border)] md:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold">Plano mensal</h2>
        <span className="font-mono text-body">{planPriceText()}<span className="text-body-sm text-lab-text-dim"> por mês</span></span>
      </div>
      <p className="text-body-sm text-lab-text-dim">{creditsText(PLAN_CREDITS)} todo mês, cerca de {reels} vídeos de 15s. Cancele quando quiser.</p>
      {plan ? <>
        <p className="text-body-sm">Ativo. Créditos renovados em {dateLabel(plan.renewedAt)}.</p>
        <form action={openBillingPortal}><Button variant="secondary">Gerenciar assinatura</Button></form>
      </> : stripeConfigured() ? <>
        <form action={startSubscription}><Button size="lg" className="w-full md:w-auto">Assinar por {planPriceText()}/mês</Button></form>
        <p className="text-caption text-lab-text-dim">Pagamento por cartão de crédito, processado pela Stripe.</p>
      </> : <p className="text-body-sm text-lab-text-dim">A assinatura abre em breve. Por enquanto, os créditos são liberados pela equipe.</p>}
    </section> : null}
    <section className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Extrato</h2>{count > 0 && <span className="font-mono text-caption text-lab-text-dim">Página {page} de {pages}</span>}</div>
      {entries.length ? <><ul className="border-t border-lab-border">{entries.map((entry) => { const delta = Number(entry.deltaBrl); const amount = delta > 0 ? balanceCredits(delta) : costCredits(-delta); return <li key={entry.id} className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-lab-border py-3"><div className="min-w-0"><p className="text-body-sm font-medium">{entryLabel(entry)}</p><p className="mt-0.5 break-words text-caption text-lab-text-dim">{entry.step?.content?.title || entry.step?.influencer?.name || "Conta LabIA"} · {dateLabel(entry.createdAt)}</p></div><span className={`font-mono text-body ${delta > 0 ? "text-lab-reagent-bright" : "text-lab-text"}`}>{delta > 0 ? "+" : "−"}{amount.toLocaleString("pt-BR")}</span></li>; })}</ul>{pages > 1 && <nav aria-label="Páginas do extrato" className="mt-2 flex justify-between gap-3">{page > 1 ? <Link href={`/saldo?page=${page - 1}`} className={buttonVariants({ variant: "secondary" })}>Anterior</Link> : <span />}{page < pages && <Link href={`/saldo?page=${page + 1}`} className={buttonVariants({ variant: "secondary" })}>Próxima</Link>}</nav>}</> : <EmptyState title="Seu histórico começa na primeira geração" description="Criar influencers e rascunhos não gasta créditos. As movimentações aparecem aqui quando você gerar." action={<Link href="/" className={buttonVariants({ variant: "secondary" })}>Explorar o estúdio</Link>} />}
    </section>
  </div>;
}
