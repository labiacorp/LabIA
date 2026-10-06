"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { costCredits } from "@/lib/plan";

export type RunItem = { label: string; status: string; startedAt: string | null; brl: number | null; typicalSeconds: number };

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

// What is generating right now: each step with its time and reserved credits. The bar follows the usual
// duration and stops at 95% until the job reports back (ponytail: time-based, not real provider progress).
export function RunProgress({ title, items }: { title: string; items: RunItem[] }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const elapsed = (item: RunItem) => (item.startedAt ? Math.max(0, Math.round((now - Date.parse(item.startedAt)) / 1000)) : 0);
  const done = items.filter((item) => item.status === "DONE" || item.status === "APPROVED").length;
  const running = items.filter((item) => item.status === "RUNNING");
  const share = (item: RunItem) => (item.status === "RUNNING" ? Math.min(0.95, elapsed(item) / item.typicalSeconds) : item.status === "PENDING" ? 0 : 1);
  const percent = Math.round((items.reduce((sum, item) => sum + share(item), 0) / Math.max(1, items.length)) * 100);
  const longest = running.reduce((max, item) => Math.max(max, elapsed(item)), 0);
  const typical = running.reduce((max, item) => Math.max(max, item.typicalSeconds), 0);
  return (
    <section role="status" aria-live="polite" className="grid gap-3 rounded-lab border border-lab-reagent/40 bg-lab-surface-1 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">{title}</p>
          <p className="font-mono text-caption text-lab-text-muted">
            {clock(longest)} · costuma levar {clock(typical)} · {done} de {items.length} prontos
          </p>
        </div>
        <span className="shrink-0 font-mono text-h3 tabular-nums text-lab-reagent-bright">{percent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-lab-surface-2">
        <div className="h-full rounded-full bg-lab-reagent transition-[width] duration-1000 ease-linear" style={{ width: `${percent}%` }} />
      </div>
      <ul className="grid gap-1.5 text-body-sm">
        {items.map((item, index) => (
          <li key={index} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              {item.status === "RUNNING" ? <Loader2 className="size-4 animate-spin text-lab-reagent-bright" aria-hidden /> : item.status === "FAILED" ? <X className="size-4 text-lab-danger" aria-hidden /> : item.status === "PENDING" ? <span className="size-4 rounded-full border border-lab-border-strong" aria-hidden /> : <Check className="size-4 text-lab-success" aria-hidden />}
              {item.label}
            </span>
            <span className="font-mono text-caption text-lab-text-dim">{item.brl === null ? "" : `${costCredits(item.brl).toLocaleString("pt-BR")} créditos`}</span>
          </li>
        ))}
      </ul>
      <p className="text-caption text-lab-text-muted">Pode sair desta tela: a geração continua e o resultado aparece aqui. Se falhar, os créditos voltam.</p>
    </section>
  );
}
