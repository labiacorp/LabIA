import type { CSSProperties, ReactNode } from "react";
import { AlertTriangle, Check, Lock, RotateCcw, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CostChip, type CostChipProps } from "@/components/ui/cost-chip";
import { cn } from "@/lib/utils";

export type NodeState = "idle" | "selected" | "running" | "ready" | "error" | "blocked";

const frame: Record<NodeState, string> = {
  idle: "border-lab-border",
  selected: "border-lab-reagent shadow-lab-focus",
  running: "border-lab-reagent animate-lab-pulse",
  ready: "border-lab-border-strong",
  error: "border-lab-danger shadow-lab-danger",
  blocked: "border-dashed border-lab-border-strong [&_.lab-node-body]:opacity-70",
};

export function LabNodeShell(props: {
  state: NodeState;
  accent: string; // ex.: "var(--lab-node-video)"
  Icon: LucideIcon;
  title: string;
  kindLabel: string; // ex.: "Animar imagem"
  cost: CostChipProps;
  progressLabel?: string; // "Gerando · 00:42"
  errorMessage?: string;
  blockedReason?: string; // "Conecte uma imagem-base"
  onRetry?: () => void;
  children: ReactNode;
  ports?: ReactNode;
  className?: string;
  /** Tooltip ao passar o mouse: descrição + entradas/saídas. */
  hint?: { description: string; tags: string[] };
}) {
  const { state, accent, Icon, title, kindLabel, cost, children } = props;
  return (
    <div data-node-state={state} className={cn("group/node relative w-72 rounded-lab border bg-lab-surface-2 text-lab-text transition-shadow duration-panel", frame[state], props.className)} style={{ "--node-accent": accent } as CSSProperties}>
      <div className="overflow-hidden rounded-[inherit]">
        <div className="h-0.5 bg-[var(--node-accent)]" />
        <header className="flex items-start justify-between gap-3 p-3 pb-0">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-control border border-lab-border bg-lab-surface-1 text-[var(--node-accent)]"><Icon className="size-4" aria-hidden /></div>
            <div className="min-w-0">
              <div className="truncate font-display text-body-sm font-medium">{title}</div>
              <div className="font-mono text-eyebrow uppercase text-lab-text-muted">{kindLabel}</div>
            </div>
          </div>
          <CostChip size="sm" {...cost} />
        </header>
        {state === "running" ? (
          <div className="mx-3 mt-3 flex items-center gap-2 font-mono text-caption text-lab-text-dim">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-lab-surface-1"><span className="block h-full w-1/2 animate-lab-shimmer bg-[linear-gradient(90deg,transparent,var(--lab-reagent),transparent)] bg-[length:200%_100%]" /></span>
            {props.progressLabel}
          </div>
        ) : null}
        {state === "blocked" && props.blockedReason ? (
          <p className="mx-3 mt-3 flex items-center gap-2 text-caption text-lab-text-dim"><Lock className="size-3.5" aria-hidden />{props.blockedReason}</p>
        ) : null}
        <div className="lab-node-body p-3">{children}</div>
        {state === "error" ? (
          <div className="mx-3 mb-3 flex items-start gap-2 rounded-control border border-lab-danger-line bg-lab-danger-dim p-2 text-caption text-lab-text">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-lab-danger" aria-hidden />
            <span className="flex-1">{props.errorMessage}</span>
            {props.onRetry ? <Button className="nodrag" size="sm" variant="secondary" onClick={props.onRetry}><RotateCcw />Tentar de novo</Button> : null}
          </div>
        ) : null}
        {state === "ready" ? <span className="sr-only"><Check /> pronto</span> : null}
      </div>
      {props.ports}
      {props.hint ? (
        <div role="tooltip" data-id="node-tooltip" className="pointer-events-none absolute left-full top-6 z-menu ml-3 hidden w-64 flex-col gap-2 rounded-control bg-lab-surface-1 p-3 opacity-0 shadow-lab-popover transition-opacity duration-micro group-hover/node:opacity-100 md:flex">
          <span className="flex items-center justify-between gap-2"><span className="font-display text-body-sm font-medium">{title}</span><CostChip size="sm" {...cost} /></span>
          <span className="text-caption text-lab-text-dim">{props.hint.description}</span>
          {props.hint.tags.length ? <span className="flex flex-wrap gap-1.5">{props.hint.tags.map((tag) => <span key={tag} className="rounded-full border border-lab-border px-1.5 font-mono text-eyebrow text-lab-text-dim">{tag}</span>)}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
