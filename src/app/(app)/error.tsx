"use client";

import { CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";

// Design error state. No status page exists, so only "Tentar de novo"; the digest is the code support can look up.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div role="alert" className="mx-auto flex max-w-content flex-col items-start gap-3.5 rounded-sheet bg-lab-surface-1 px-6 py-7 shadow-[inset_0_0_0_1.5px_var(--lab-danger)]">
    <span className="flex size-11 items-center justify-center rounded-control bg-lab-danger text-lab-on-reagent"><CloudOff className="size-[22px]" aria-hidden /></span>
    <h1 className="font-display text-[34px] font-black uppercase leading-[.95]">Não carregou</h1>
    <p className="max-w-[460px] text-[15px] leading-[1.5] text-lab-text-dim">Não conseguimos carregar esta página. Nenhuma cobrança foi feita.</p>
    <Button size="lg" onClick={reset}>Tentar de novo</Button>
    {error.digest ? <span className="font-mono text-caption text-lab-text-dim">código: {error.digest}</span> : null}
  </div>;
}
