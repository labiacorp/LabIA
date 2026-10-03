import type { ReactNode } from "react";
import { Workflow, type LucideIcon } from "lucide-react";

export function EmptyState({ title, description, action, icon: Icon = Workflow }: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return <section className="rounded-lab border border-dashed border-lab-border-strong bg-lab-surface-1 p-7">
    <Icon className="mb-4 size-6 text-lab-text-dim" aria-hidden />
    <h2 className="font-display text-xl font-medium">{title}</h2>
    <p className="mt-3 max-w-lg text-body-sm leading-6 text-lab-text-dim">{description}</p>
    {action ? <div className="mt-5 flex flex-wrap items-center gap-3">{action}</div> : null}
  </section>;
}
