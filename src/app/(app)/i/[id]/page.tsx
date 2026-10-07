import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { Prisma } from "@/generated/prisma/client";
import { buttonVariants } from "@/components/ui/button";
import { chargeBrl, costCredits, costText, creditsText } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { DeleteInfluencer, EditInfluencer } from "./influencer-actions";
import { KitWatcher } from "./personagem/kit-watcher";

export const dynamic = "force-dynamic";

// Página da influencer, from the design: portrait, numbers, actions and her contents. The character sheet and
// side/detail portraits stay in the backend (they keep the face consistent) and are not shown here.
export default async function InfluencerPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const influencer = await prisma.influencer.findFirst({ where: { id, userId } });
  if (!influencer) notFound();
  const [face, contents, files, spentRows, running] = await Promise.all([
    influencer.faceAssetId ? prisma.asset.findFirst({ where: { id: influencer.faceAssetId, userId }, select: { url: true } }) : null,
    prisma.content.findMany({ where: { influencerId: id, archivedAt: null }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], include: { steps: { select: { kind: true, status: true, actualCostBrl: true } }, assets: { where: { userId, kind: "IMAGE" }, orderBy: { createdAt: "desc" }, take: 1, select: { url: true } } } }),
    prisma.asset.count({ where: { userId, OR: [{ influencerId: id }, { content: { influencerId: id } }] } }),
    prisma.$queryRaw<{ spent: Prisma.Decimal | null }[]>`
      SELECT -SUM(l.delta_brl) AS spent FROM ledger_entries l JOIN steps s ON s.id = l.step_id LEFT JOIN contents c ON c.id = s.content_id
      WHERE l.user_id = ${userId} AND (s.influencer_id = ${id} OR c.influencer_id = ${id})`,
    // The character sheet made after the face approval finishes in the background; the watcher collects it.
    prisma.step.count({ where: { influencerId: id, kind: "CHARACTER", status: "RUNNING" } }),
  ]);
  const spent = Math.max(0, Number(spentRows[0]?.spent ?? 0));
  const finished = contents.filter((item) => item.status === "APPROVED" || item.status === "REVIEW");
  const perVideo = finished.length ? finished.reduce((sum, item) => sum + item.steps.reduce((s, step) => s + chargeBrl(Number(step.actualCostBrl ?? 0)), 0), 0) / finished.length : null;
  const created = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" }).format(influencer.createdAt).replace(".", "");
  const first = influencer.name.split(" ")[0];

  return <div className="mx-auto flex max-w-content flex-col gap-7">
    <KitWatcher influencerId={id} active={running > 0} />
    <div className="grid items-end gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <span className="relative aspect-[4/5] w-full max-w-[200px] overflow-hidden rounded-card bg-[repeating-linear-gradient(135deg,var(--lab-surface-2)_0_12px,var(--lab-surface-3)_12px_24px)] lg:max-w-[280px]">{face ? <Image src={face.url} alt={`Rosto da ${influencer.name}`} fill unoptimized className="object-cover" /> : null}</span>
      <div className="flex flex-col gap-3.5">
        <span className="text-body-sm text-lab-text-dim">{influencer.niche} · criada em {created}</span>
        <h1 className="break-words font-display text-[44px] font-black uppercase leading-[.9] lg:text-[64px]">{influencer.name}</h1>
        <div className="grid grid-cols-3 border-y border-lab-border">
          <div className="flex flex-col gap-0.5 py-3"><span className="font-mono text-[11px] text-lab-text-dim">conteúdos</span><span className="font-mono text-xl">{contents.length}</span></div>
          <div className="flex flex-col gap-0.5 border-l border-lab-border py-3 pl-3"><span className="font-mono text-[11px] text-lab-text-dim">gasto ✓</span><span className="font-mono text-xl">{costText(spent)}</span></div>
          <div className="flex flex-col gap-0.5 border-l border-lab-border py-3 pl-3"><span className="font-mono text-[11px] text-lab-text-dim">por vídeo</span><span className="font-mono text-xl">{perVideo === null ? "—" : creditsText(costCredits(perVideo))}</span></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {face ? <Link href={`/conteudos/novo?influencer=${id}`} className={buttonVariants({ className: "h-12 px-[18px] text-[15px]" })}><Plus className="size-[18px]" />Novo conteúdo</Link>
            : <Link href={`/influenciadores/nova?id=${id}`} className={buttonVariants({ className: "h-12 px-[18px] text-[15px]" })}>Escolher o rosto</Link>}
          <EditInfluencer influencer={{ id, name: influencer.name, niche: influencer.niche, description: influencer.visualSignature }} />
          <DeleteInfluencer influencer={{ id, name: influencer.name }} contents={contents.length} files={files} spent={costText(spent)} />
        </div>
      </div>
    </div>
    <section className="flex flex-col gap-2.5">
      <h2 className="font-display text-[30px] font-black uppercase leading-none">Conteúdos da {first}</h2>
      {contents.length === 0 ? <p className="text-body-sm text-lab-text-dim">Nenhum conteúdo ainda.{face ? <> <Link href={`/conteudos/novo?influencer=${id}`} className="underline underline-offset-[3px]">Criar o primeiro</Link></> : null}</p> : contents.map((item) => {
        const failed = item.steps.some((step) => step.status === "FAILED");
        const [status, dot] = failed ? ["Falhou · estornado", "bg-lab-danger"] : item.status === "APPROVED" ? ["Pronto", "bg-lab-text"] : item.status === "REVIEW" ? ["Revisar vídeo", "bg-lab-warning"] : item.status === "IDEA" ? ["Rascunho", "bg-lab-text-dim"] : ["Em produção", "bg-lab-info"];
        const cost = item.steps.reduce((sum, step) => sum + chargeBrl(Number(step.actualCostBrl ?? 0)), 0);
        return <Link key={item.id} href={`/i/${id}/c/${item.id}`} className="flex items-center gap-3.5 rounded-card bg-lab-surface-1 p-2.5 shadow-[inset_0_0_0_1px_var(--lab-border)] hover:shadow-[inset_0_0_0_1.5px_var(--lab-text-dim)] focus-visible:outline-none focus-visible:shadow-lab-focus">
          <span className="relative aspect-[9/16] w-12 shrink-0 overflow-hidden rounded-lg lab-placeholder-media">{item.assets[0] ? <Image src={item.assets[0].url} alt="" fill unoptimized className="object-cover" /> : null}</span>
          <span className="flex min-w-0 flex-1 flex-col gap-1"><span className="flex items-center gap-1.5 text-caption text-lab-text-dim"><span className={`size-1.5 rounded-full ${dot}`} />{status}</span><span className="break-words text-[15px] font-semibold">{item.title}</span></span>
          <span className="shrink-0 font-mono text-[13px]">{costText(cost)}</span>
        </Link>;
      })}
    </section>
  </div>;
}
