import Link from "next/link";
import type { ReactNode } from "react";

export function AuthTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <>
      <h1 className="font-display text-h2 font-bold tracking-tight text-lab-text">{title}</h1>
      {children ? <p className="mt-1.5 text-body-sm text-lab-text-dim">{children}</p> : null}
    </>
  );
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="rounded-control text-body-sm text-lab-text-dim underline-offset-4 hover:text-lab-text hover:underline focus-visible:outline-none focus-visible:shadow-lab-focus">
      {children}
    </Link>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-eyebrow uppercase text-lab-text-muted" aria-hidden>
      <span className="h-px flex-1 bg-lab-border" />
      ou
      <span className="h-px flex-1 bg-lab-border" />
    </div>
  );
}
