"use client";

import { DatabaseZap, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({ title = "Não foi possível carregar esta página", description = "A conexão não respondeu. Tente novamente em instantes.", onRetry }: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return <section role="alert" className="flex flex-wrap items-start gap-3.5 rounded-lab border border-lab-danger-line bg-lab-surface-1 p-5">
    <DatabaseZap className="mt-0.5 size-5 shrink-0 text-lab-danger" aria-hidden />
    <div className="min-w-0 flex-1 basis-44">
      <h2 className="font-display text-base font-medium">{title}</h2>
      <p className="mt-1.5 text-body-sm leading-5 text-lab-text-dim">{description}</p>
    </div>
    {onRetry ? <Button variant="secondary" size="sm" onClick={onRetry}><RotateCcw />Tentar de novo</Button> : null}
  </section>;
}
