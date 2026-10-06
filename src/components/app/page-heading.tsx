import type { ReactNode } from "react";

export function PageHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-display text-[clamp(40px,7vw,56px)] leading-[.9]">{title}</h1><p className="mt-3 max-w-2xl text-body leading-6 text-lab-text-dim">{description}</p></div>{action}</div>;
}
