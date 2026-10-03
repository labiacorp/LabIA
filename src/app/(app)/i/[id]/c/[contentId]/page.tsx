import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, stepStatus } from "@/components/ui/badge";
import { CostChip } from "@/components/ui/cost-chip";
import { Alert } from "@/components/ui/alert";
import { sceneQuote } from "@/lib/content-generation";
import { getBalanceBrl } from "@/lib/ledger";
import { formatBrlValue } from "@/lib/money";
import { estimateReel } from "@/lib/content-plan";
import { PIPELINE } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { KitWatcher } from "../../personagem/kit-watcher";
import { generateScene } from "./actions";
import { SceneForm } from "./scene-form";

export const dynamic = "force-dynamic";

export default async function ContentPage({ params }: { params: Promise<{ id: string; contentId: string }> }) {
  const userId = await requireUserId();
  const { id, contentId } = await params;
  const content = await prisma.content.findFirst({
    where: { id: contentId, influencerId: id, influencer: { userId } },
    include: { steps: { orderBy: { position: "asc" }, include: { assets: true } }, influencer: { select: { name: true } } },
  });
  if (!content) notFound();

  const { steps } = content;
  const total = (pick: (step: (typeof steps)[number]) => { toString(): string } | null) => steps.reduce((sum, step) => sum + Number(pick(step)?.toString() ?? 0), 0);
  const reel = estimateReel();
  const estimated = reel.totalBrl;
  const spent = total((step) => step.actualCostBrl);
  const price = sceneQuote().totalBrl;
  const [balance, front] = await Promise.all([
    getBalanceBrl(userId),
    prisma.asset.findFirst({ where: { userId, influencerId: id, role: "FRONT", step: { status: { in: ["DONE", "APPROVED"] } } }, select: { id: true } }),
  ]);
  const blockedReason = !front ? "Gere o retrato de frente na aba Personagem antes de criar a cena."
    : balance + 1e-9 < price ? `Saldo insuficiente: você tem ${formatBrlValue(balance)} e precisa de ${formatBrlValue(price)}.` : undefined;

  return (
    <div className="grid gap-6">
      <KitWatcher influencerId={id} active={steps.some((step) => step.status === "RUNNING")} />
      <div>
        <Link href={`/i/${id}`} className="text-body-sm text-lab-text-dim hover:text-lab-text">← {content.influencer.name}</Link>
        <h1 className="mt-2 font-display text-h1">{content.title}</h1>
        {content.idea ? <p className="mt-1.5 max-w-form text-body-sm text-lab-text-dim">{content.idea}</p> : null}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <CostChip state="estimated" value={estimated} prefix="reel de 15s (sem voz)" />
          <CostChip state="actual" value={spent} prefix="gasto" />
        </div>
      </div>
      <ol className="grid gap-3">
        {steps.map((step, index) => {
          const info = PIPELINE.find((item) => item.kind === step.kind)!;
          const [variant, label] = stepStatus[step.status];
          return (
            <li key={step.id} className="flex flex-wrap items-start gap-3 rounded-lab border border-lab-border bg-lab-surface-1 p-4 sm:gap-4 sm:p-5">
              <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-caption text-lab-on-reagent ${info.accent}`}>{index + 1}</span>
              <div className="min-w-0 flex-1 basis-40">
                <p className="font-display text-h3">{info.title}</p>
                <p className="mt-0.5 text-body-sm text-lab-text-dim">{info.description}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Badge variant={variant} dot>{label}</Badge>
                {(() => {
                  const planned = reel.perStep[step.kind];
                  if (step.actualCostBrl) return <CostChip size="sm" state="actual" value={Number(step.actualCostBrl.toString())} />;
                  if (step.estimatedCostBrl) return <CostChip size="sm" state="estimated" value={Number(step.estimatedCostBrl.toString())} />;
                  if (planned === 0) return <CostChip size="sm" state="free" value={0} />;
                  return <CostChip size="sm" state={planned == null ? "pending" : "estimated"} value={planned ?? undefined} />;
                })()}
              </div>
              {step.kind === "IMAGE" ? <div className="w-full min-w-0">
                {step.status === "PENDING" || step.status === "QUOTED" ? <SceneForm
                  action={generateScene.bind(null, id, contentId)} intent={randomUUID()} expectedBrl={price}
                  prompt={content.idea || content.title} blockedReason={blockedReason}
                /> : null}
                {step.status === "RUNNING" ? <p role="status" className="mt-3 text-body-sm text-lab-text-dim">Gerando imagem… O custo está reservado.</p> : null}
                {step.status === "FAILED" ? <Alert variant="error" title="Esta geração falhou">{step.error}</Alert> : null}
                {step.assets.map((asset) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={asset.id} src={asset.url} alt="Imagem da cena com o influencer" className="mt-4 max-h-[32rem] max-w-full rounded-control border border-lab-border object-contain" />
                ))}
              </div> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
