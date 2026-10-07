import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { InAppBrowserBar } from "@/components/app/in-app-browser-bar";

// Signed-out frame from the design (LabIA App.dc.html · Acesso): on desktop a brand panel on the left and the
// form on the right; on mobile the wordmark above the form.
const wordmark = (size: string) => <span className={`lab-wordmark ${size} leading-none`}>Lab<span>I</span>A</span>;

export function AuthShell({ title, description, icon, children }: { title?: string; description?: ReactNode; icon?: ReactNode; children: ReactNode }) {
  return <main className="flex min-h-screen">
    <aside className="relative hidden w-[46%] shrink-0 flex-col justify-between overflow-hidden border-r border-lab-border bg-lab-surface-1 p-12 lg:flex">
      {wordmark("text-[30px]")}
      <div className="flex flex-col gap-6">
        <p className="font-display text-[84px] font-black uppercase leading-[.86]">O custo antes.<br /><span className="text-lab-text-dim">O real depois.</span></p>
        <div className="flex flex-wrap items-center gap-2.5" aria-hidden>
          <span className="flex h-9 items-center rounded-full border-[1.5px] border-lab-reagent px-3.5 font-mono text-[15px] text-lab-reagent-bright">~66 créditos</span>
          <ArrowRight className="size-[18px] text-lab-text-dim" />
          <span className="flex h-9 items-center rounded-full bg-lab-reagent px-3.5 font-mono text-[15px] font-semibold text-lab-on-reagent">63 créditos ✓</span>
        </div>
      </div>
      <span className="font-mono text-caption text-lab-text-dim">Uma assinatura · créditos todo mês</span>
    </aside>
    <div className="flex flex-1 flex-col items-center justify-center px-6 pb-10 pt-6 lg:p-12">
      <div className="flex w-full max-w-[400px] flex-col gap-5">
        <InAppBrowserBar />
        <span className="mb-3 lg:hidden">{wordmark("text-[32px]")}</span>
        {icon}
        {title ? <h1 className="font-display text-[56px] font-black uppercase leading-[.9]">{title}</h1> : null}
        {description ? <p className="text-[15px] leading-[1.5] text-lab-text-dim">{description}</p> : null}
        {children}
      </div>
    </div>
  </main>;
}
