import type { ReactNode } from "react";
import { InAppBrowserBar } from "@/components/app/in-app-browser-bar";

// The narrow, centered frame shared by every signed-out page (login, access code, e-mail flows).
export function AuthShell({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return <main className="mx-auto flex min-h-screen w-full max-w-[400px] flex-col justify-center gap-5 px-5 py-10">
    <InAppBrowserBar />
    <p className="lab-wordmark mb-3 text-[32px] leading-none">Lab<span>I</span>A</p>
    <h1 className="font-display text-[clamp(44px,12vw,56px)] leading-[.9]">{title}</h1>
    {description ? <p className="text-body leading-6 text-lab-text-dim">{description}</p> : null}
    {children}
  </main>;
}
