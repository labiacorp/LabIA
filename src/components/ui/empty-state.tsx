import type { ReactNode } from "react";
import { Plus, type LucideIcon } from "lucide-react";

// Design empty state: dashed frame, a row of 9:16 tiles ending in the page icon, a display title, one action.
export function EmptyState({ title, description, action, icon: Icon = Plus }: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return <section className="flex flex-col items-start gap-3.5 rounded-sheet border-[1.5px] border-dashed border-lab-border-strong px-6 py-8">
    <div className="flex gap-1.5" aria-hidden>
      <span className="h-16 w-9 rounded-lg border-[1.5px] border-dashed border-lab-border-strong" />
      <span className="h-16 w-9 rounded-lg border-[1.5px] border-dashed border-lab-border-strong" />
      <span className="flex h-16 w-9 items-center justify-center rounded-lg bg-lab-surface-3"><Icon className="size-[18px]" /></span>
    </div>
    <h2 className="font-display text-[34px] font-black uppercase leading-[.95]">{title}</h2>
    <p className="max-w-[440px] text-[15px] leading-[1.5] text-lab-text-dim">{description}</p>
    {action ? <div className="flex flex-wrap items-center gap-3">{action}</div> : null}
  </section>;
}
