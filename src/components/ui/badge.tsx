// PROPOSTA v2 — substitui components/ui/badge.tsx. Custo saiu para <CostChip>.
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 h-7 text-caption font-medium", {
  variants: {
    variant: {
      default: "border-lab-border bg-lab-surface-2 text-lab-text-dim",
      model: "border-lab-border bg-lab-surface-2 font-mono text-[11px] uppercase tracking-[0.08em] text-lab-text-dim", // "reagentes": FLUX, KLING…
      proposal: "border-dashed border-lab-border-strong text-lab-text-dim", // marca "proposta"
      // status (Projeto e run de Fluxo) — ponto colorido + texto neutro, nunca verde-reagente
      draft: "border-lab-border bg-transparent text-lab-text-dim [&>i]:bg-lab-text-muted",
      running: "border-lab-info/30 bg-lab-info-dim text-lab-text [&>i]:bg-lab-info [&>i]:animate-pulse",
      review: "border-lab-warning-line bg-lab-warning-dim text-lab-text [&>i]:bg-lab-warning",
      ready: "border-lab-success/30 bg-lab-success-dim text-lab-text [&>i]:bg-lab-success",
      error: "border-lab-danger-line bg-lab-danger-dim text-lab-text [&>i]:bg-lab-danger",
      archived: "border-lab-border bg-transparent text-lab-text-muted [&>i]:bg-lab-border-strong",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> { dot?: boolean }

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot ? <i className="size-1.5 rounded-full" aria-hidden /> : null}
      {children}
    </span>
  );
}

// Rótulos PT-BR oficiais
export const contentStatus = {
  IDEA: ["draft", "Ideia"], IN_PROGRESS: ["running", "Em produção"], REVIEW: ["review", "Para revisar"],
  APPROVED: ["ready", "Aprovado"], REJECTED: ["archived", "Descartado"],
} as const;

export const stepStatus = {
  PENDING: ["draft", "Aguardando"], QUOTED: ["review", "Aprovar custo"], RUNNING: ["running", "Gerando"],
  DONE: ["review", "Revisar"], FAILED: ["error", "Falhou"], APPROVED: ["ready", "Aprovado"],
} as const;

export { Badge };
