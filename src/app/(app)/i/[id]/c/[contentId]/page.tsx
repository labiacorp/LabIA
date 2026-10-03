import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, stepStatus } from "@/components/ui/badge";
import { CostChip } from "@/components/ui/cost-chip";
import { PIPELINE } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ContentPage({ params }: { params: Promise<{ id: string; contentId: string }> }) {
  const userId = await requireUserId();
  const { id, contentId } = await params;
  const content = await prisma.content.findFirst({
    where: { id: contentId, influencerId: id, influencer: { userId } },
    include: { steps: { orderBy: { position: "asc" } }, influencer: { select: { name: true } } },
  });
  if (!content) notFound();

  const { steps } = content;
  const total = (pick: (step: (typeof steps)[number]) => { toString(): string } | null) => steps.reduce((sum, step) => sum + Number(pick(step)?.toString() ?? 0), 0);
  const estimated = total((step) => step.estimatedCostBrl);
  const spent = total((step) => step.actualCostBrl);
  const hasQuote = steps.some((step) => step.estimatedCostBrl);

  return (
    <div className="grid gap-6">
      <div>
        <Link href={`/i/${id}`} className="text-body-sm text-lab-text-dim hover:text-lab-text">← {content.influencer.name}</Link>
        <h1 className="mt-2 font-display text-h1">{content.title}</h1>
        {content.idea ? <p className="mt-1.5 max-w-form text-body-sm text-lab-text-dim">{content.idea}</p> : null}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <CostChip state={hasQuote ? "estimated" : "pending"} value={hasQuote ? estimated : undefined} prefix="estimado" />
          <CostChip state="actual" value={spent} prefix="gasto" />
        </div>
      </div>
      <ol className="grid gap-3">
        {steps.map((step, index) => {
          const info = PIPELINE.find((item) => item.kind === step.kind)!;
          const [variant, label] = stepStatus[step.status];
          return (
            <li key={step.id} className="flex items-start gap-4 rounded-lab border border-lab-border bg-lab-surface-1 p-5">
              <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-caption text-lab-on-reagent ${info.accent}`}>{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-h3">{info.title}</p>
                <p className="mt-0.5 text-body-sm text-lab-text-dim">{info.description}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Badge variant={variant} dot>{label}</Badge>
                <CostChip size="sm" state={step.actualCostBrl ? "actual" : step.estimatedCostBrl ? "estimated" : "pending"} value={Number((step.actualCostBrl ?? step.estimatedCostBrl)?.toString() ?? NaN)} />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
