// NOVO (proposta) — components/ui/cost-chip.tsx. Substitui <Badge variant="cost"> e os "custo R$0" soltos.
// Regra: custo desconhecido = "A calcular", nunca R$0. Falha de leitura = "indisponível", nunca R$0.
import * as React from "react";
import { cva } from "class-variance-authority";
import { Check, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";

const chip = cva("inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 font-mono tabular-nums", {
  variants: {
    state: {
      estimated: "border-lab-reagent-line bg-lab-reagent-dim text-lab-reagent-bright",
      actual: "border-lab-reagent-line bg-lab-reagent-dim text-lab-reagent-bright",
      free: "border-lab-reagent-line bg-lab-reagent-dim text-lab-reagent-bright", // importação: R$0,00 conhecido
      pending: "border-dashed border-lab-border-strong bg-transparent text-lab-text-dim", // A calcular
      unavailable: "border-lab-border bg-lab-surface-2 text-lab-text-muted", // falha ao ler
    },
    size: { sm: "h-5 text-[11px]", md: "h-6 text-caption", lg: "h-8 px-3 text-body-sm" },
  },
  defaultVariants: { state: "estimated", size: "md" },
});

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v).replace(/\s/g, "");

export type CostChipProps = {
  state: "estimated" | "actual" | "free" | "pending" | "unavailable";
  value?: number;
  prefix?: string; // ex.: "mês"
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function CostChip({ state, value, prefix, size, className }: CostChipProps) {
  let label: React.ReactNode;
  if (state === "pending" || value === undefined && state !== "unavailable") label = "A calcular";
  else if (state === "unavailable") label = <><CloudOff className="size-3" aria-hidden />indisponível</>;
  else if (state === "estimated") label = `~${brl(value!)}`;
  else if (state === "free") label = brl(0);
  else label = <>{brl(value!)}<Check className="size-3" aria-label="custo real" /></>;
  return (
    <span className={cn(chip({ state, size }), className)}>
      {prefix ? <span className="text-lab-text-muted">{prefix}</span> : null}
      {label}
    </span>
  );
}
