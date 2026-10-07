import Image from "next/image";
import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { Prisma } from "@/generated/prisma/client";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Toast } from "@/components/ui/toast";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { getBalanceBrl } from "@/lib/ledger";
import { estimateReel } from "@/lib/content-plan";
import { balanceCredits, costCredits, creditsText } from "@/lib/plan";

// Início, from the design (LabIA App.dc.html · Início): greeting, credits, continue where you left off, month numbers, influencers.
const ORDER = ["SCRIPT", "IMAGE", "VIDEO", "ASSEMBLY"] as const;
const LABEL: Record<(typeof ORDER)[number], string> = { SCRIPT: "Roteiro", IMAGE: "Imagem", VIDEO: "Vídeo", ASSEMBLY: "Montagem" };
const tz = "America/Sao_Paulo";
const card = "flex flex-col gap-3.5 rounded-sheet bg-lab-surface-1 p-[22px]";
const eyebrow = "font-mono text-caption uppercase tracking-[.1em] text-lab-text-dim";

export default async function DashboardPage() {
  const userId = await requireUserId();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [user, balance, influencers, last, spend, perInfluencer, finished] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true } }),
    getBalanceBrl(userId).catch(() => null),
    prisma.influencer.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 12, select: { id: true, name: true, faceAssetId: true, _count: { select: { contents: true } } } }),
    prisma.content.findFirst({ where: { influencer: { userId }, archivedAt: null }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], include: { influencer: { select: { name: true } }, steps: { select: { kind: true, status: true } }, assets: { where: { userId, kind: "IMAGE" }, orderBy: { createdAt: "desc" }, take: 1, select: { url: true } } } }),
    prisma.ledgerEntry.aggregate({ where: { userId, createdAt: { gte: monthStart }, reason: { in: ["SPEND", "REFUND"] } }, _sum: { deltaBrl: true } }),
    prisma.$queryRaw<{ id: string; spent: Prisma.Decimal }[]>`
      SELECT COALESCE(s.influencer_id, c.influencer_id) AS id, -SUM(l.delta_brl) AS spent
      FROM ledger_entries l JOIN steps s ON s.id = l.step_id LEFT JOIN contents c ON c.id = s.content_id
      WHERE l.user_id = ${userId} GROUP BY 1`,
    prisma.$queryRaw<{ spent: Prisma.Decimal }[]>`
      SELECT -SUM(l.delta_brl) AS spent FROM ledger_entries l JOIN steps s ON s.id = l.step_id JOIN contents c ON c.id = s.content_id
      WHERE l.user_id = ${userId} AND c.status IN ('REVIEW', 'APPROVED') GROUP BY c.id`,
  ]);
  const faces = await prisma.asset.findMany({ where: { id: { in: influencers.map((i) => i.faceAssetId).filter((id): id is string => !!id) }, userId }, select: { id: true, url: true } });

  const first = (user.name || user.email.split("@")[0]).split(" ")[0];
  const hour = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: tz }).format(now));
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const today = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "short", timeZone: tz }).format(now).replace(".", "");
  const month = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: tz }).format(now);
  const reel = estimateReel();
  const reelCredits = costCredits(reel.totalBrl);
  const unlimited = balance === Infinity;
  const credits = balance === null || unlimited ? 0 : balanceCredits(balance);
  const state = balance === null ? "unknown" : unlimited ? "team" : credits === 0 ? "zero" : credits < reelCredits ? "low" : "ok";
  const ring = { zero: "var(--lab-danger)", low: "var(--lab-warning)" }[state as string] ?? "var(--lab-border)";
  const color = { zero: "text-lab-danger", low: "text-lab-warning", unknown: "text-lab-text-muted" }[state as string] ?? "text-lab-reagent-bright";
  const sub = {
    unknown: "Não conseguimos ler seus créditos agora.",
    team: "Conta da equipe: gera sem créditos.",
    zero: "Sem créditos. Veja o plano para gerar a próxima etapa.",
    low: `Não cobre um vídeo de 15s. Faltam ~${creditsText(reelCredits - credits)} pro próximo.`,
    ok: `Dá para uns ${Math.floor(credits / reelCredits)} vídeos de 15s.`,
  }[state];
  const avg = finished.length ? finished.reduce((sum, row) => sum + Number(row.spent), 0) / finished.length : null;
  const spentByInfluencer = new Map(perInfluencer.map((row) => [row.id, Number(row.spent)]));

  const steps = last ? ORDER.flatMap((kind) => last.steps.filter((step) => step.kind === kind)) : [];
  const nextIndex = steps.findIndex((step) => step.status !== "DONE" && step.status !== "APPROVED");
  const next = nextIndex === -1 ? null : steps[nextIndex];
  const nextCost = next ? reel.perStep[next.kind] ?? 0 : 0;
  const dot = !last ? "" : steps.some((step) => step.status === "FAILED") ? "bg-lab-danger" : last.status === "REVIEW" ? "bg-lab-warning" : last.status === "APPROVED" ? "bg-lab-text" : last.status === "IDEA" ? "bg-lab-text-dim" : "bg-lab-info";

  return <div className="mx-auto flex max-w-content flex-col gap-7">
    {state === "low" ? <Toast tone="warning" title="Créditos baixos">{creditsText(credits)} não cobrem um vídeo (~{creditsText(reelCredits)}).</Toast> : null}
    {influencers.length === 0 ? <h1 className="font-display text-[44px] font-black uppercase leading-[.9] lg:text-[64px]">Início</h1>
      : <div className="flex flex-col gap-1.5"><span className={eyebrow}>{today}</span><h1 className="font-display text-[44px] font-black uppercase leading-[.9] lg:text-[64px]">{greeting}, {first}</h1></div>}
    {influencers.length === 0 ? <EmptyState icon={Sparkles} title="Bora começar" description="Crie sua primeira influencer em uns 10 minutos." action={<Link href="/influenciadores/nova" className={buttonVariants({ size: "lg" })}><Plus className="size-[18px]" />Criar influencer</Link>} /> : <>
      <div className="grid gap-4 md:grid-cols-2">
        <div className={card} style={{ boxShadow: `inset 0 0 0 1.5px ${ring}` }}>
          <span className={eyebrow}>Créditos</span>
          <span className={`font-display text-[76px] font-black leading-[.85] ${color}`}>{state === "unknown" ? "—" : unlimited ? "Equipe" : credits.toLocaleString("pt-BR")}</span>
          <span className={`text-body-sm leading-[1.5] ${{ zero: "text-lab-danger", low: "text-lab-warning" }[state as string] ?? "text-lab-text-dim"}`}>{sub}</span>
          <div className="flex flex-wrap gap-2">
            {unlimited ? null : <Link href="/saldo" className={state === "zero" || state === "low" ? "flex h-12 items-center rounded-full bg-lab-reagent px-[18px] text-[15px] font-semibold text-lab-on-reagent" : buttonVariants({ size: "md", className: "h-12 px-[18px] text-[15px]" })}>Ver plano</Link>}
            <Link href="/saldo" className={buttonVariants({ variant: "secondary", className: "h-12 px-4 text-[15px]" })}>Ver extrato</Link>
          </div>
        </div>
        <div className={`${card} shadow-[inset_0_0_0_1px_var(--lab-border)]`}>
          <span className={eyebrow}>Continue de onde parou</span>
          {last ? <>
            <div className="flex gap-3.5">
              <span className="relative aspect-[9/16] w-16 shrink-0 overflow-hidden rounded-control lab-placeholder-media">{last.assets[0] ? <Image src={last.assets[0].url} alt="" fill unoptimized className="object-cover" /> : null}</span>
              <div className="flex min-w-0 flex-col gap-1.5"><span className="flex items-center gap-1.5 text-caption"><span className={`size-1.5 rounded-full ${dot}`} />{last.influencer.name}{next ? ` · etapa ${nextIndex + 1} de ${steps.length}` : " · pronto"}</span><span className="font-display text-[26px] font-black uppercase leading-[.95]">{last.title}</span></div>
            </div>
            <Link href={`/i/${last.influencerId}/c/${last.id}`} className={`mt-auto flex h-[52px] items-center justify-between rounded-full pl-5 text-[15px] font-semibold ${nextCost > 0 ? "bg-lab-reagent pr-1.5 text-lab-on-reagent" : "bg-lab-text pr-5 text-lab-bg"}`}>
              {next ? `Continuar · ${LABEL[next.kind as (typeof ORDER)[number]]}` : "Ver conteúdo"}
              {nextCost > 0 ? <span className="flex h-10 items-center rounded-full bg-lab-on-reagent px-3 font-mono text-body-sm text-lab-reagent-bright">~{creditsText(costCredits(nextCost))}</span> : null}
            </Link>
          </> : <>
            <span className="font-display text-[26px] font-black uppercase leading-[.95]">Nenhum conteúdo ainda</span>
            <Link href="/conteudos/novo" className={buttonVariants({ size: "lg", className: "mt-auto w-full" })}>Novo conteúdo</Link>
          </>}
        </div>
      </div>
      <div className="grid grid-cols-2 border-y border-lab-border">
        <div className="flex flex-col gap-1 py-4"><span className="font-mono text-caption text-lab-text-dim">créditos usados em {month}</span><span className="font-mono text-[26px]">{costCredits(Math.max(0, -Number(spend._sum.deltaBrl ?? 0))).toLocaleString("pt-BR")}</span></div>
        <div className="flex flex-col gap-1 border-l border-lab-border py-4 pl-4"><span className="font-mono text-caption text-lab-text-dim">média por vídeo pronto</span><span className="font-mono text-[26px]">{avg === null ? "—" : costCredits(avg).toLocaleString("pt-BR")}</span></div>
      </div>
      <section className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between"><h2 className="font-display text-[30px] font-black uppercase leading-none">Suas influencers</h2><Link href="/influenciadores" className="min-h-11 content-center text-body-sm underline underline-offset-[3px]">Ver todas</Link></div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {influencers.map((item) => { const face = faces.find((f) => f.id === item.faceAssetId); return <Link key={item.id} href={`/i/${item.id}`} className="flex w-40 shrink-0 flex-col overflow-hidden rounded-card bg-lab-surface-1 focus-visible:outline-none focus-visible:shadow-lab-focus">
            <span className="relative block aspect-[4/5] w-full lab-placeholder-media">{face ? <Image src={face.url} alt="" fill unoptimized className="object-cover" /> : null}</span>
            <span className="flex flex-col gap-1 px-3 pb-3 pt-2.5"><span className="font-display text-xl font-black uppercase leading-none">{item.name}</span><span className="font-mono text-caption text-lab-text-dim">{item._count.contents} · {creditsText(costCredits(spentByInfluencer.get(item.id) ?? 0))}</span></span>
          </Link>; })}
        </div>
      </section>
    </>}
  </div>;
}
