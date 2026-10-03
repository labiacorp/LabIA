"use client";

import { useEffect, useId, useRef } from "react";
import { AlertTriangle, Loader2, Receipt, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { LabNodeKind } from "@/lib/flows/graph";
import { cn } from "@/lib/utils";

export type CostConfirmItem = { nodeId: string; label: string; kind: LabNodeKind; brl: number };

type CostConfirmModalProps = {
  open: boolean;
  totalBrl: number | null;
  items: CostConfirmItem[];
  isLoading: boolean;
  isConfirming: boolean;
  errorMessage: string | null;
  formatBrl: (value: number) => string;
  onCancel: () => void;
  onConfirm: () => void;
  onRetry?: () => void;
};

const kindLabels: Record<LabNodeKind, string> = {
  "text-input": "Briefing", "asset-input": "Imagem-base", prompt: "Prompt",
  "image-generation": "Gerar imagem", "video-generation": "Animar imagem",
  "video-extend": "Continuar clipe", "video-assembly": "Juntar clipes",
  text2video: "Texto para vídeo", note: "Nota", "asset-output": "Saída",
};

export function CostConfirmModal({ open, totalBrl, items, isLoading, isConfirming, errorMessage, formatBrl, onCancel, onConfirm, onRetry }: CostConfirmModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => cancelButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isConfirming) onCancel();
      if (event.key !== "Tab") return;
      const buttons = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]') ?? [])];
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (!first) { event.preventDefault(); dialogRef.current?.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [isConfirming, onCancel, open]);

  if (!open) return null;
  const knownCost = totalBrl !== null && Number.isFinite(totalBrl) && totalBrl >= 0;
  const canConfirm = !isLoading && !isConfirming && !errorMessage && knownCost;

  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-lab-scrim px-4 py-8" onMouseDown={(event) => { if (event.target === event.currentTarget && !isConfirming) onCancel(); }} data-id="cost-confirm-modal">
    <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="w-full max-w-[480px] rounded-lab border border-lab-border-strong bg-lab-surface-1 p-5 text-lab-text shadow-[0_24px_64px_rgba(0,0,0,.65)] outline-none">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-control border border-lab-border bg-lab-surface-2 text-lab-text-dim">{isLoading ? <Loader2 className="size-[18px] animate-spin" /> : <Receipt className="size-[18px]" />}</div>
        <div className="min-w-0"><h2 id={titleId} className="font-display text-lg font-medium">Confirmar custo do fluxo</h2><p id={descriptionId} className="mt-1 text-sm leading-5 text-lab-text-dim">Estimativa antes de rodar. Confirmar pode gerar gasto real ou consumir a cota da conexão selecionada.</p></div>
      </div>
      <div className={cn("mt-4 rounded-control border px-4 py-3", knownCost && !errorMessage ? "border-lab-reagent-line bg-lab-reagent-dim" : "border-dashed border-lab-border-strong")}>
        <div className="font-mono text-eyebrow font-medium uppercase tracking-[.08em] text-lab-text-dim">Custo estimado total</div>
        <div aria-live="polite" className={cn("mt-1 font-mono text-[28px] font-semibold leading-8", knownCost && !errorMessage ? "text-lab-reagent-bright" : "text-lab-text-dim")} data-id="cost-confirm-total">{isLoading ? "Calculando…" : !knownCost || errorMessage ? "A calcular" : `${totalBrl! > 0 ? "~" : ""}${formatBrl(totalBrl!).replace(/\s/g, "")}`}</div>
      </div>
      {errorMessage ? <div role="alert" className="mt-4 flex gap-2.5 rounded-control border border-lab-danger-line bg-lab-danger-dim px-3 py-2.5 text-[13px] leading-[18px]"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-lab-danger" /><p>{errorMessage}<span className="mt-1 block text-lab-text-dim">Sem estimativa, nada roda.</span></p></div> : isLoading ? <div className="mt-4 flex items-center gap-2 rounded-control border border-lab-border bg-lab-surface-2 px-3 py-3 text-sm text-lab-text-dim"><Loader2 className="size-4 animate-spin" />Consultando o custo do fluxo atual.</div> : <div aria-label="Custo por nó" className="mt-4 max-h-56 overflow-y-auto rounded-control border border-lab-border bg-lab-surface-2">{items.map((item) => <div key={item.nodeId} className="flex items-center justify-between gap-3 border-b border-lab-border px-3 py-2.5 last:border-b-0">
        <div className="flex min-w-0 items-center gap-2.5"><span aria-hidden className={cn("h-7 w-[3px] shrink-0 rounded-sm", item.kind === "image-generation" ? "bg-[var(--lab-node-image)]" : "bg-[var(--lab-node-video)]")} /><span className="min-w-0"><span className="block truncate text-sm font-medium">{item.label}</span><span className="block font-mono text-eyebrow text-lab-text-muted">{kindLabels[item.kind] ?? "Nó do fluxo"}</span></span></div><span className="shrink-0 font-mono text-sm font-medium text-lab-reagent-bright">{item.brl > 0 ? "~" : ""}{formatBrl(item.brl).replace(/\s/g, "")}</span>
      </div>)}</div>}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} ref={cancelButtonRef} disabled={isConfirming} data-id="cost-confirm-cancel">Cancelar</Button>
        {errorMessage && onRetry ? <Button type="button" variant="secondary" onClick={onRetry}><RotateCcw />Estimar de novo</Button> : <Button type="button" onClick={onConfirm} disabled={!canConfirm} data-id="cost-confirm-accept">{isConfirming ? <Loader2 className="animate-spin" /> : null}Confirmar e executar</Button>}
      </div>
    </div>
  </div>;
}
