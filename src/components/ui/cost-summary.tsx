// What a paid action will cost, item by item, and the balance before and after: shown before the user confirms.
// Values arrive in reais of provider cost; plan.ts turns them into credits. A team account (Infinity) is not debited.
import { balanceCredits, costCredits, creditsText } from "@/lib/plan";
import { cn } from "@/lib/utils";

export type CostItem = { label: string; brl: number };

export function CostSummary({ items, balanceBrl, className }: { items: CostItem[]; balanceBrl: number; className?: string }) {
  const total = items.reduce((sum, item) => sum + item.brl, 0);
  const now = balanceCredits(balanceBrl);
  const after = now - costCredits(total);
  return (
    <div className={cn("grid gap-2 rounded-control border border-lab-border bg-lab-surface-2/50 p-3 text-body-sm", className)}>
      {items.length > 1 ? (
        <ul className="grid gap-1 border-b border-lab-border pb-2">
          {items.map((item, index) => (
            <li key={index} className="flex justify-between gap-3 text-lab-text-dim">
              <span>{item.label}</span>
              <span className="font-mono tabular-nums">{costCredits(item.brl).toLocaleString("pt-BR")}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{items.length > 1 ? "Total" : items[0]?.label ?? "Total"}</span>
        <span className="font-mono tabular-nums text-lab-reagent-bright">~{creditsText(costCredits(total))}</span>
      </p>
      <p className="font-mono text-caption text-lab-text-muted">
        {Number.isFinite(balanceBrl) ? (
          <>saldo {now.toLocaleString("pt-BR")} → <span className={after < 0 ? "text-lab-danger" : "text-lab-text"}>{after.toLocaleString("pt-BR")}</span> créditos</>
        ) : (
          "conta da equipe: não desconta créditos"
        )}
      </p>
    </div>
  );
}

// Button text with the price in it, so the click itself says what it costs.
export const withCost = (label: string, brl?: number) => (brl === undefined ? label : `${label} · ${creditsText(costCredits(brl))}`);
