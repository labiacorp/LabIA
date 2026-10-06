import Link from "next/link";
import { stripeConfigured, TOPUP_PACKS_BRL } from "@/lib/stripe";
import { startTopup } from "./topup";
import { PageHeading } from "@/components/app/page-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { getBalanceBrl, getFalCreditsUsd } from "@/lib/ledger";
import { videoUsdBrlRate } from "@/lib/video-options";
import { currency, dateLabel } from "@/lib/platform";

export default async function BalancePage({ searchParams }: { searchParams: Promise<{page?: string; pago?: string; erro?: string}> }) {
  const userId = await requireUserId();
  const query = await searchParams;
  const requested = Number(query.page);
  const [balance, count] = await Promise.all([getBalanceBrl(userId), prisma.ledgerEntry.count({where:{userId}})]);
  const pages = Math.max(1, Math.ceil(count / 25));
  const page = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested,pages) : 1;
  const entries = await prisma.ledgerEntry.findMany({ where: { userId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip:(page-1)*25, take: 25, include: { step: { select: { content: { select: { title: true } }, influencer: { select: { name: true } } } } } });
  const falUsd = balance === Infinity ? await getFalCreditsUsd() : undefined;
  const labels = { TOPUP: "Crédito adicionado", SPEND: "Reserva para geração", REFUND: "Devolução de reserva" };
  const big = "font-display text-[clamp(64px,10vw,104px)] font-black uppercase leading-[.85] text-lab-reagent-bright";
  return <div className="mx-auto flex max-w-content flex-col gap-8 [&>div:first-child]:mb-0">
    <PageHeading title="Saldo e extrato" description="Seus créditos e o histórico de uso, centavo por centavo." />
    <section className="flex flex-col gap-3.5 rounded-sheet bg-lab-surface-1 p-6 shadow-[inset_0_0_0_1px_var(--lab-border)] md:p-8">
      {falUsd === undefined ? <><span className="lp-eyebrow">Disponível para criar</span><p className={big}>{currency(balance)}</p></> : <><span className="lp-eyebrow">Conta da equipe · gera sem saldo · crédito real na fal.ai</span><p className={big}>{falUsd === null ? "Indisponível" : falUsd.toLocaleString("en-US", { style: "currency", currency: "USD" })}</p>{falUsd !== null && <p className="font-mono text-body-sm text-lab-text-dim">≈ {currency(falUsd * videoUsdBrlRate())}</p>}</>}
      <details className="max-w-2xl text-body-sm text-lab-text-dim"><summary className="min-h-11 cursor-pointer py-2.5">Como o saldo funciona</summary><p className="leading-6">Os créditos entram por cartão (ou pela equipe, na beta). Cada geração reserva o valor confirmado por você. A diferença é devolvida após a confirmação do custo final; apurações pendentes mantêm a reserva. Se a geração falhar, a reserva volta inteira.</p></details>
    </section>
    {query.pago ? <p role="status" className="rounded-lab border-[1.5px] border-lab-border-strong bg-lab-surface-1 p-4 text-body-sm">Pagamento recebido. O saldo atualiza em instantes; se não mudar em um minuto, recarregue a página.</p> : null}
    {query.erro ? <p role="alert" className="rounded-lab border-[1.5px] border-lab-danger-line bg-lab-danger-dim p-4 text-body-sm">Não foi possível iniciar a recarga. Tente de novo em instantes.</p> : null}
    {falUsd === undefined ? <section className="flex flex-col gap-3.5">
      <h2 className="font-display text-[30px] font-black leading-none">Recarregar</h2>
      {stripeConfigured() ? <>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{TOPUP_PACKS_BRL.map((value) => <form key={value} action={startTopup} className="flex flex-col gap-2 rounded-card bg-lab-surface-1 p-4 shadow-[inset_0_0_0_1px_var(--lab-border)]"><input type="hidden" name="amount" value={value} /><span className="font-display text-[44px] font-black leading-[.9]">R$ {value}</span><span className="font-mono text-caption text-lab-text-dim">~{Math.floor(value / 7.02)} vídeos de 15s</span><button className={buttonVariants({ size: "md", className: "mt-1 w-full" })}>Pagar com cartão</button></form>)}</div>
        <p className="text-caption text-lab-text-dim">Pagamento por cartão de crédito, processado pela Stripe. O saldo não expira e você só paga pelo que usar.</p>
      </> : <p className="text-body-sm text-lab-text-dim">A recarga por cartão está chegando. Por enquanto, os créditos são adicionados pela equipe.</p>}
    </section> : null}
    <section className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-[30px] font-black leading-none">Extrato</h2>{count > 0 && <span className="font-mono text-caption text-lab-text-dim">Página {page} de {pages}</span>}</div>
      {entries.length ? <><ul className="border-t border-lab-border">{entries.map((entry) => { const delta = Number(entry.deltaBrl); return <li key={entry.id} className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-lab-border py-3"><div className="min-w-0"><p className="text-body-sm font-medium">{labels[entry.reason]}</p><p className="mt-0.5 break-words text-caption text-lab-text-dim">{entry.step?.content?.title || entry.step?.influencer?.name || "Conta LabIA"} · {dateLabel(entry.createdAt)}</p></div><span className={`font-mono text-body ${delta > 0 ? "text-lab-reagent-bright" : "text-lab-text"}`}>{delta > 0 ? "+" : "−"}{currency(Math.abs(delta))}</span></li>; })}</ul>{pages > 1 && <nav aria-label="Páginas do extrato" className="mt-2 flex justify-between gap-3">{page > 1 ? <Link href={`/saldo?page=${page-1}`} className={buttonVariants({variant:"secondary"})}>Anterior</Link> : <span />}{page < pages && <Link href={`/saldo?page=${page+1}`} className={buttonVariants({variant:"secondary"})}>Próxima</Link>}</nav>}</> : <EmptyState title="Seu histórico começa na primeira geração" description="Criar influencers e rascunhos é gratuito. As movimentações aparecem aqui quando você usar créditos." action={<Link href="/" className={buttonVariants({variant:"secondary"})}>Explorar o estúdio</Link>} />}
    </section>
  </div>;
}
