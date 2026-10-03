import Link from "next/link";
import { Workflow } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { CostChip, type CostChipProps } from "@/components/ui/cost-chip";
import { cn } from "@/lib/utils";

export type FlowCardData = {
  id: string;
  name: string;
  updatedAt: Date | string;
  project?: { id: string; name: string } | null;
  runs: Array<{
    status?: string;
    totalActualCostBrl: number | {toString(): string} | null;
    totalEstimatedCostBrl: number | {toString(): string} | null;
    outputs?: unknown;
  }>;
};
const statusMeta: Record<string, {label:string;variant:BadgeProps["variant"];dot:string}> = {
  draft: {label:"Rascunho",variant:"draft",dot:"bg-lab-text-muted"},
  queued: {label:"Na fila",variant:"running",dot:"bg-lab-info"},
  running: {label:"Rodando",variant:"running",dot:"bg-lab-info"},
  done: {label:"Pronto",variant:"ready",dot:"bg-lab-success"},
  failed: {label:"Erro",variant:"error",dot:"bg-lab-danger"},
  cancelled: {label:"Cancelado",variant:"archived",dot:"bg-lab-text-muted"},
};
export function flowCost(flow: FlowCardData): CostChipProps {
  const run = flow.runs[0];
  if (!run) return {state:"pending"};
  const actual = run.totalActualCostBrl === null ? undefined : Number(run.totalActualCostBrl);
  const estimated = run.totalEstimatedCostBrl === null ? undefined : Number(run.totalEstimatedCostBrl);
  if (run.status === "done" || (run.status === "failed" && actual !== undefined && actual > 0)) return {state:"actual",value:actual};
  return {state:"estimated",value:estimated};
}
function mediaFromOutput(value: unknown, depth = 0): {url:string;video:boolean} | undefined {
  if (!value || typeof value !== "object" || depth > 5) return;
  const obj = value as Record<string,unknown>;
  const url = typeof obj.url === "string" ? obj.url : typeof obj.assetUrl === "string" ? obj.assetUrl : undefined;
  if (url && /^https?:\/\//.test(url)) return {url,video:obj.type === "video" || obj.type === "VIDEO" || /\.(mp4|webm)(\?|$)/i.test(url)};
  for (const child of Object.values(obj)) { const media=mediaFromOutput(child,depth+1); if(media) return media; }
}
export function FlowCard({flow,compact=false}: {flow:FlowCardData;compact?:boolean}) {
  const status=statusMeta[flow.runs[0]?.status ?? "draft"] ?? statusMeta.draft;
  const media=mediaFromOutput(flow.runs[0]?.outputs);
  const date = new Intl.DateTimeFormat("pt-BR",{day:"numeric",month:"short"}).format(new Date(flow.updatedAt));
  return <Link href={`/fluxos/${flow.id}`} className={cn("group flex min-w-0 items-center gap-3 overflow-hidden rounded-lab border border-lab-border bg-lab-surface-1 p-2.5 transition-colors hover:border-lab-border-strong focus-visible:outline-none focus-visible:shadow-lab-focus",compact ? "rounded-none border-0 border-b px-3.5 py-3 last:border-0" : "sm:block sm:p-0")}>
    <div className={cn("lab-placeholder-media relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-control text-lab-text-muted",compact ? "size-12" : "sm:aspect-[16/10] sm:h-auto sm:w-full sm:rounded-none")}>
      {media ? media.video ? <video src={media.url} muted preload="metadata" aria-label={`Resultado de ${flow.name}`} className="size-full object-cover" /> :
        // eslint-disable-next-line @next/next/no-img-element
        <img src={media.url} alt={`Resultado de ${flow.name}`} className="size-full object-cover" /> : <Workflow aria-hidden className="size-5 text-lab-text-muted" />}
      {!compact ? <Badge dot variant={status.variant} className="absolute left-2 top-2 hidden h-[22px] bg-lab-scrim text-eyebrow sm:inline-flex">{status.label}</Badge> : null}
    </div>
    <div className={cn("min-w-0 flex-1",compact ? "" : "sm:p-3.5")}>
      <h3 className={cn("line-clamp-2 font-display text-body-sm font-medium",compact ? "" : "sm:min-h-10 sm:text-[15px]")}>{flow.name}</h3>
      <div className={cn("mt-1 flex items-center gap-1.5 text-caption text-lab-text-dim",compact ? "" : "sm:mt-2.5 sm:justify-between")}>
        <span className="flex min-w-0 items-center gap-1.5">
          <i aria-hidden className={cn("size-1.5 shrink-0 rounded-full",status.dot)} />
          <span className="truncate">{compact ? `${status.label} · ` : null}{flow.project?.name ?? "Sem projeto"}<span className={compact ? "hidden" : "hidden sm:inline"}> · {date}</span></span>
        </span>
        {!compact ? <CostChip {...flowCost(flow)} size="sm" className="hidden sm:inline-flex" /> : null}
      </div>
    </div>
    <CostChip {...flowCost(flow)} size="sm" className={compact ? "border-0 bg-transparent px-0" : "border-0 bg-transparent px-0 sm:hidden"} />
  </Link>;
}
