import type { ReactNode } from "react";

// The narrow, centered frame shared by every signed-out page (login, access code, e-mail flows).
export function AuthShell({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return <main className="mx-auto flex min-h-screen max-w-form flex-col justify-center gap-6 px-5 py-8">
    <div><p className="lab-wordmark text-h1">Lab<span>IA</span></p><h1 className="mt-6 font-display text-h2">{title}</h1>{description ? <p className="mt-3 text-body-sm leading-6 text-lab-text-dim">{description}</p> : null}</div>
    {children}
  </main>;
}
