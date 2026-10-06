// Cost in credits (values arrive in reais of provider cost and are converted by plan.ts).
// Rule: unknown cost = "A calcular", never 0. Read failure = "indisponível", never 0.
import * as React from "react";
import { cva } from "class-variance-authority";
import { Check, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { balanceCredits, costCredits, creditsText } from "@/lib/plan";

const chip = cva("inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 font-mono tabular-nums", {
  variants: {
    state: {
      estimated: "border-[1.5px] border-lab-reagent bg-transparent text-lab-reagent-bright",
      actual: "border-lab-reagent bg-lab-reagent font-semibold text-lab-on-reagent",
      free: "border-lab-reagent bg-lab-reagent font-semibold text-lab-on-reagent", // known zero, e.g. an import
      pending: "border-dashed border-lab-border-strong bg-transparent text-lab-text-dim", // A calcular
      unavailable: "border-lab-border bg-lab-surface-2 text-lab-text-muted", // falha ao ler
    },
    size: { sm: "h-6 text-[11px]", md: "h-[26px] px-2.5 text-caption", lg: "h-9 px-3.5 text-body-sm" },
  },
  defaultVariants: { state: "estimated", size: "md" },
});


export type CostChipProps = {
  state: "estimated" | "actual" | "free" | "pending" | "unavailable";
  value?: number; // reais of provider cost
  prefix?: string; // ex.: "mês"
  size?: "sm" | "md" | "lg";
  plain?: boolean; // saldo e outros valores que não são custo real: sem o ✓
  className?: string;
};

export function CostChip({ state, value, prefix, size, plain, className }: CostChipProps) {
  let label: React.ReactNode;
  if (state === "pending" || value === undefined && state !== "unavailable") label = "A calcular";
  else if (state === "unavailable") label = <><CloudOff className="size-3" aria-hidden />indisponível</>;
  else if (state === "estimated") label = `~${creditsText(costCredits(value!))}`;
  else if (state === "free") label = "grátis";
  else label = <>{creditsText(plain ? balanceCredits(value!) : costCredits(value!))}{plain ? null : <Check className="size-3" aria-label="custo real" />}</>;
  return (
    <span className={cn(chip({ state, size }), className)}>
      {prefix ? <span className="text-lab-text-muted">{prefix}</span> : null}
      {label}
    </span>
  );
}
