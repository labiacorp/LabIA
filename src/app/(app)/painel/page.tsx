import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { getBalanceBrl } from "@/lib/ledger";
import { estimateReel } from "@/lib/content-plan";
import { balanceCredits, costCredits, creditsText } from "@/lib/plan";
import { ProductionCard } from "@/components/app/production-card";

const card = "rounded-sheet bg-lab-surface-1 p-5 shadow-[inset_0_0_0_1px_var(--lab-border)] md:p-[22px] flex flex-col gap-3.5";

export default async function DashboardPage() {
  const userId = await requireUserId();
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const [user, balance, influencers, recent, spend] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true } }),
    getBalanceBrl(userId).catch(() => null),
    prisma.influencer.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 12, select: { id: true, name: true, niche: true, faceAssetId: true, _count: { select: { contents: true } } } }),
    prisma.content.findMany({ where: { influencer: { userId }, archivedAt: null }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 6, include: { influencer: { select: { name: true } }, assets: { where: { userId, kind: "IMAGE" }, orderBy: { createdAt: "desc" }, take: 1, select: { url: true } } } }),
    prisma.ledgerEntry.aggregate({ where: { userId, createdAt: { gte: monthStart }, reason: { in: ["SPEND", "REFUND"] } }, _sum: { deltaBrl: true } }),
  ]);
  const faces = await prisma.asset.findMany({ where: { id: { in: influencers.map((i) => i.faceAssetId).filter((id): id is string => !!id) }, userId }, select: { id: true, url: true } });
  const spent = Math.max(0, -Number(spend._sum.deltaBrl ?? 0));
  const first = (user.name || user.email.split("@")[0]).split(" ")[0];
  const today = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" }).format(new Date());
  const unlimited = balance === Infinity;
  const reel = costCredits(estimateReel().totalBrl);
  const credits = balance === null || unlimited ? 0 : balanceCredits(balance);
  const last = recent[0];
  return <div className="mx-auto flex max-w-content flex-col gap-7">
    <div className="flex flex-col gap-1.5"><span className="lp-eyebrow">{today}</span><h1 className="font-display text-[clamp(40px,7vw,56px)] leading-[.9]">Olá, {first}</h1></div>
    {influencers.length === 0 || recent.length === 0 ? <section className="rounded-sheet bg-lab-surface-1 p-5 shadow-[inset_0_0_0_1px_var(--lab-border)] md:p-6">
      <span className="lp-eyebrow">Comece em 3 passos</span>
      <ol className="mt-3 grid gap-2 md:grid-cols-3">
        {[
          { done: influencers.length > 0, n: "01", title: "Crie a influencer", text: "Defina o rosto, o nicho e o tom. Rascunhos são grátis.", href: "/?criar=1", cta: "Criar influencer" },
          { done: recent.length > 0, n: "02", title: "Prepare um conteúdo", text: "Título, ideia e roteiro. Ainda sem gastar nada.", href: "/conteudos/novo", cta: "Novo conteúdo" },
          { done: !!balance && balance > 0, n: "03", title: "Assine e gere", text: "Créditos todo mês. Você vê quantos cada etapa usa antes de gerar.", href: "/saldo", cta: "Ver plano" },
        ].map((step) => <li key={step.n} className={`flex flex-col gap-2 rounded-card p-4 ${step.done ? "opacity-60" : "bg-lab-surface-2"}`}>
          <span className="font-mono text-caption text-lab-text-dim">{step.n}{step.done ? " · feito ✓" : ""}</span>
          <span className="font-display text-[26px] font-black uppercase leading-none">{step.title}</span>
          <span className="text-body-sm text-lab-text-dim">{step.text}</span>
          {step.done ? null : <Link href={step.href} className={buttonVariants({ size: "sm", className: "mt-auto self-start" })}>{step.cta}</Link>}
        </li>)}
      </ol>
    </section> : null}
    <div className="grid gap-4 md:grid-cols-2">
      <div className={card}>
        <span className="text-body-sm text-lab-text-dim">Créditos</span>
        <span className="font-display text-[clamp(56px,9vw,76px)] font-black uppercase leading-[.85] text-lab-reagent-bright">{balance === null ? "—" : unlimited ? "Equipe" : credits.toLocaleString("pt-BR")}</span>
        <span className="text-body-sm leading-6 text-lab-text-dim">{balance === null ? "Não foi possível ler os créditos agora." : unlimited ? "Conta da equipe: gera sem créditos." : credits < reel ? `Faltam ${creditsText(reel - credits)} para um vídeo de 15s (~${creditsText(reel)}).` : `Dá para uns ${Math.floor(credits / reel)} vídeos de 15s.`}</span>
        <div className="mt-auto"><Link href="/saldo" className={buttonVariants({ variant: !unlimited && balance !== null && credits < reel ? "primary" : "secondary" })}>{!unlimited && balance !== null && credits < reel ? "Ver plano" : "Ver extrato"}</Link></div>
      </div>
      <div className={card}>
        <span className="lp-eyebrow">Continue de onde parou</span>
        {last ? <>
          <div className="flex gap-3.5"><span className="relative aspect-[9/16] w-16 shrink-0 overflow-hidden rounded-lab bg-lab-surface-2">{last.assets[0] ? <Image src={last.assets[0].url} alt="" fill unoptimized className="object-cover" /> : null}</span><div className="flex min-w-0 flex-col gap-1.5"><span className="font-mono text-caption text-lab-text-dim">{last.influencer.name}</span><span className="font-display text-[26px] font-black uppercase leading-[.95]">{last.title}</span></div></div>
          <div className="mt-auto"><Link href={`/i/${last.influencerId}/c/${last.id}`} className={buttonVariants({ size: "lg", className: "w-full" })}>Continuar<ArrowRight className="size-4" /></Link></div>
        </> : <>
          <span className="font-display text-[26px] font-black uppercase leading-[.95]">Sua primeira história começa aqui</span>
          <p className="text-body-sm leading-6 text-lab-text-dim">Escolha uma influencer e prepare o primeiro briefing. O rascunho é gratuito.</p>
          <div className="mt-auto"><Link href="/conteudos/novo" className={buttonVariants({ size: "lg", className: "w-full" })}>Novo conteúdo</Link></div>
        </>}
      </div>
    </div>
    <div className="grid grid-cols-2 border-y border-lab-border">
      <div className="flex flex-col gap-1 py-4"><span className="font-mono text-caption text-lab-text-dim">créditos usados no mês</span><span className="font-mono text-[26px]">{costCredits(spent).toLocaleString("pt-BR")}</span></div>
      <div className="flex flex-col gap-1 border-l border-lab-border py-4 pl-4"><span className="font-mono text-caption text-lab-text-dim">conteúdos ativos</span><span className="font-mono text-[26px]">{recent.length === 6 ? "6+" : recent.length}</span></div>
    </div>
    <section className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between"><h2 className="font-display text-[30px] font-black leading-none">Suas influencers</h2><Link href="/influenciadores" className="min-h-11 content-center text-body-sm underline underline-offset-4">Ver todas</Link></div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {influencers.map((item) => { const face = faces.find((f) => f.id === item.faceAssetId); return <Link key={item.id} href={`/i/${item.id}`} className="flex w-40 shrink-0 flex-col overflow-hidden rounded-card bg-lab-surface-1">
          <span className="relative block aspect-[4/5] w-full lab-placeholder-media">{face ? <Image src={face.url} alt="" fill unoptimized className="object-cover" /> : null}</span>
          <span className="flex flex-col gap-1 px-3 pb-3 pt-2.5"><span className="font-display text-xl font-black uppercase leading-none">{item.name}</span><span className="font-mono text-caption text-lab-text-dim">{item._count.contents} conteúdos</span></span>
        </Link>; })}
        <Link href="/?criar=1" className="flex min-h-[220px] w-40 shrink-0 flex-col items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-lab-border-strong text-body-sm text-lab-text-dim"><Plus className="size-6" />Nova</Link>
      </div>
    </section>
    <section className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between"><h2 className="font-display text-[30px] font-black leading-none">Conteúdos recentes</h2><Link href="/conteudos" className="min-h-11 content-center text-body-sm underline underline-offset-4">Ver todos</Link></div>
      {recent.length ? <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{recent.map((c) => <ProductionCard key={c.id} id={c.id} influencerId={c.influencerId} title={c.title} influencerName={c.influencer.name} status={c.status} updatedAt={c.updatedAt} preview={c.assets[0]?.url} />)}</div>
        : <EmptyState title="Nada por aqui ainda" description="Os conteúdos que você criar aparecem aqui, com o custo de cada etapa." action={<Link href="/conteudos/novo" className={buttonVariants({ variant: "secondary" })}>Novo conteúdo</Link>} />}
    </section>
  </div>;
}
