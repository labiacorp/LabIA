import type { ReactNode } from "react";
import { Workflow, type LucideIcon } from "lucide-react";

export function EmptyState({ title, description, action, icon: Icon = Workflow }: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return <section className="rounded-sheet border-[1.5px] border-dashed border-lab-border-strong p-6 md:p-8">
    <Icon className="mb-4 size-6 text-lab-text-dim" aria-hidden />
    <h2 className="font-display text-[34px] leading-[.95]">{title}</h2>
    <p className="mt-3 max-w-lg text-body leading-6 text-lab-text-dim">{description}</p>
    {action ? <div className="mt-5 flex flex-wrap items-center gap-3">{action}</div> : null}
  </section>;
}
