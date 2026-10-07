import Image from "next/image";
import Link from "next/link";
import { Film, Plus } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { buttonVariants } from "@/components/ui/button";
import { CostChip } from "@/components/ui/cost-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { estimateReel } from "@/lib/content-plan";
import { chargeBrl, costCredits, creditsText } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

// Conteúdos · Lista, from the design: status chips, one row per content with its credits spent and planned.
const TABS = [
  { key: "", label: "Todos", where: {} },
  { key: "producao", label: "Em produção", where: { status: { in: ["IN_PROGRESS", "REVIEW"] } } },
  { key: "prontos", label: "Prontos", where: { status: "APPROVED" } },
  { key: "falhou", label: "Falhou", where: { steps: { some: { status: "FAILED" } } } },
] as const satisfies { key: string; label: string; where: Prisma.ContentWhereInput }[];
const PAGE = 24;

export default async function ContentsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string; influencer?: string }> }) {
  const userId = await requireUserId();
  const params = await searchParams;
  const tab = TABS.find((item) => item.key === params.status) ?? TABS[0];
  const base: Prisma.ContentWhereInput = { influencer: { userId }, archivedAt: null, ...(params.influencer ? { influencerId: params.influencer } : {}) };
  const counts = await Promise.all(TABS.map((item) => prisma.content.count({ where: { ...base, ...item.where } })));
  const total = counts[TABS.indexOf(tab)];
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const requested = Number(params.page);
  const page = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, pages) : 1;
  const items = await prisma.content.findMany({
    where: { ...base, ...tab.where },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * PAGE,
    take: PAGE,
    include: {
      influencer: { select: { name: true } },
      steps: { select: { kind: true, status: true, actualCostBrl: true, estimatedCostBrl: true } },
      assets: { where: { userId, kind: "IMAGE" }, orderBy: { createdAt: "desc" }, take: 1, select: { url: true } },
    },
  });
  const reel = estimateReel();
  const href = (key: string, p = 1) => {
    const query = new URLSearchParams();
    if (key) query.set("status", key);
    if (params.influencer) query.set("influencer", params.influencer);
    if (p > 1) query.set("page", String(p));
    return `/conteudos${query.size ? `?${query}` : ""}`;
  };

  return <div className="mx-auto flex max-w-content flex-col gap-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <h1 className="font-display text-[30px] font-black uppercase leading-[.9] lg:text-[40px]">Conteúdos</h1>
      <Link href="/conteudos/novo" className={buttonVariants({ className: "h-12 px-[18px] text-[15px]" })}><Plus className="size-[18px]" />Novo</Link>
    </div>
    {counts[0] === 0 ? <EmptyState icon={Film} title="Rolo vazio" description={`Grave o primeiro conteúdo. Um vídeo de 15s usa cerca de ${creditsText(costCredits(reel.totalBrl))}.`} action={<Link href="/conteudos/novo" className={buttonVariants({ size: "lg" })}><Plus className="size-[18px]" />Novo conteúdo</Link>} /> : <>
      <nav aria-label="Filtrar conteúdos" className="flex gap-1.5 overflow-x-auto">
        {TABS.map((item, index) => <Link key={item.key} href={href(item.key)} aria-current={item === tab ? "page" : undefined}
          className={`flex h-10 shrink-0 items-center rounded-full px-3.5 text-body-sm ${item === tab ? "bg-lab-text font-semibold text-lab-bg" : "bg-lab-surface-2"}`}>{item.label} · {counts[index]}</Link>)}
      </nav>
      {items.length === 0 ? <p className="text-body-sm text-lab-text-dim">Nenhum conteúdo aqui. <Link href={href("")} className="underline underline-offset-[3px]">Ver todos</Link></p> : <ul className="flex flex-col gap-2.5">
        {items.map((item) => {
          const stages = item.steps.filter((step) => step.kind !== "CHARACTER");
          const failed = stages.some((step) => step.status === "FAILED");
          const done = stages.filter((step) => step.status === "APPROVED" || (step.kind === "SCRIPT" && step.status === "DONE")).length;
          const [status, dot] = failed ? ["Falhou · estornado", "bg-lab-danger"]
            : item.status === "APPROVED" ? ["Pronto", "bg-lab-text"]
            : item.status === "REVIEW" ? ["Revisar vídeo", "bg-lab-warning"]
            : item.status === "IDEA" ? ["Rascunho", "bg-lab-text-dim"]
            : [`Em produção · ${done} de ${stages.length}`, "bg-lab-info"];
          const spent = stages.reduce((sum, step) => sum + chargeBrl(Number(step.actualCostBrl ?? 0)), 0);
          const planned = stages.reduce((sum, step) => sum + Number(step.actualCostBrl ?? step.estimatedCostBrl ?? reel.perStep[step.kind] ?? 0), 0);
          return <li key={item.id}><Link href={`/i/${item.influencerId}/c/${item.id}`} className="flex gap-3.5 rounded-card bg-lab-surface-1 p-3 shadow-[inset_0_0_0_1px_var(--lab-border)] hover:shadow-[inset_0_0_0_1.5px_var(--lab-text-dim)] focus-visible:outline-none focus-visible:shadow-lab-focus">
            <span className="relative aspect-[9/16] w-16 shrink-0 overflow-hidden rounded-control lab-placeholder-media">{item.assets[0] ? <Image src={item.assets[0].url} alt="" fill unoptimized className="object-cover" /> : null}</span>
            <span className="flex min-w-0 flex-1 flex-col gap-1.5 py-0.5">
              <span className="flex items-center gap-1.5 text-caption text-lab-text-dim"><span className={`size-1.5 rounded-full ${dot}`} />{status} · {item.influencer.name}</span>
              <span className="break-words font-display text-[22px] font-black uppercase leading-[.95]">{item.title}</span>
              <span className="mt-auto flex flex-wrap gap-1.5">
                {spent > 0 ? <CostChip state="actual" value={spent} /> : <span className="flex h-[26px] items-center rounded-full border-[1.5px] border-lab-border-strong px-2.5 font-mono text-caption">0 créditos</span>}
                {item.status !== "APPROVED" && planned > 0 ? <CostChip state="estimated" value={planned} prefix="total" /> : null}
              </span>
            </span>
          </Link></li>;
        })}
      </ul>}
      {pages > 1 ? <nav aria-label="Páginas" className="flex justify-between gap-3">{page > 1 ? <Link href={href(tab.key, page - 1)} className={buttonVariants({ variant: "secondary" })}>Anterior</Link> : <span />}{page < pages ? <Link href={href(tab.key, page + 1)} className={buttonVariants({ variant: "secondary" })}>Próxima</Link> : null}</nav> : null}
    </>}
  </div>;
}
