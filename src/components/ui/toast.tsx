"use client";

import { useState } from "react";
import { Check, CircleAlert, Wallet, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Design toast (LabIA App.dc.html): top-centred card with an icon tile, title, body and a close button.
// `money` (lime tile) is only for credit events; `done` is any other success.
const tones: Record<"money" | "done" | "error" | "warning", { Icon: LucideIcon; tile: string; ring: string }> = {
  money: { Icon: Check, tile: "bg-lab-reagent", ring: "var(--lab-border-strong)" },
  done: { Icon: Check, tile: "bg-lab-text", ring: "var(--lab-border-strong)" },
  error: { Icon: CircleAlert, tile: "bg-lab-danger", ring: "var(--lab-danger)" },
  warning: { Icon: Wallet, tile: "bg-lab-warning", ring: "var(--lab-warning)" },
};

export function Toast({ tone = "done", title, children }: { tone?: keyof typeof tones; title: string; children?: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  const { Icon, tile, ring } = tones[tone];
  return <div role={tone === "error" ? "alert" : "status"} className="pointer-events-none fixed inset-x-3 top-[72px] z-toast flex justify-center lg:left-[248px] lg:top-[76px]">
    <div className="pointer-events-auto flex w-full max-w-[440px] items-center gap-3 rounded-card bg-lab-surface-2 py-3 pl-3.5 pr-2" style={{ boxShadow: `0 20px 50px rgba(0,0,0,.6), inset 0 0 0 1.5px ${ring}` }}>
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg text-lab-on-reagent", tile)}><Icon className="size-[17px]" aria-hidden /></span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5"><span className="text-[15px] font-semibold">{title}</span>{children ? <span className="text-[13px] leading-[1.4] text-lab-text-dim">{children}</span> : null}</div>
      <button type="button" aria-label="Fechar aviso" onClick={() => setOpen(false)} className="flex size-11 shrink-0 items-center justify-center rounded-full text-lab-text-dim hover:bg-lab-surface-3 focus-visible:outline-none focus-visible:shadow-lab-focus"><X className="size-[18px]" aria-hidden /></button>
    </div>
  </div>;
}
