import type { ReactNode } from "react";

export function PageHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-wrap items-end justify-between gap-4 pt-5"><div><p className="mb-2 font-mono text-caption uppercase tracking-widest text-lab-text-muted">Seu laboratório</p><h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1><p className="mt-3 max-w-2xl text-body-sm leading-6 text-lab-text-dim">{description}</p></div>{action}</div>;
}
