"use client";

import { useActionState, useId, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { CostConfirm } from "@/components/app/cost-confirm";
import { Textarea } from "@/components/ui/field";
import { rateText } from "@/lib/plan";
import { track } from "@/lib/track";
import type { getImageOptions } from "@/lib/content-generation";
import type { ContentState } from "./actions";

export const pill = "h-8 max-w-full rounded-full border-0 bg-lab-surface-2 px-3 text-[13px] text-lab-text focus-visible:outline-none focus-visible:shadow-lab-focus disabled:opacity-60";

// Image stage, as in the design's stage card: model and quality as chips, the scene text tucked away, one cost button.
export function SceneForm({ action, intent, options, balanceBrl, prompt, blockedReason, label = "Gerar imagem" }: {
  action: (previous: ContentState, data: FormData) => Promise<ContentState>;
  intent: string;
  options: ReturnType<typeof getImageOptions>;
  balanceBrl: number;
  prompt: string;
  blockedReason?: string;
  label?: string;
}) {
  const promptId = useId();
  const [state, formAction, pending] = useActionState(action, {});
  const first = options.find((item) => item.configurations.length);
  const [selection, setSelection] = useState({ model: first?.model ?? "", resolution: first?.configurations.find((item) => item.resolution === "1K")?.resolution ?? first?.configurations[0]?.resolution ?? "" });
  const option = options.find((item) => item.model === selection.model);
  const configuration = option?.configurations.find((item) => item.resolution === selection.resolution);
  return (
    <form action={formAction} onSubmit={() => track("generate_clicked", { kind: "image", estimate_brl: configuration?.brl ?? 0 })} className="flex flex-col gap-3.5" aria-busy={pending}>
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="expectedBrl" value={configuration?.brl ?? ""} />
      <input type="hidden" name="model" value={selection.model} />
      <input type="hidden" name="resolution" value={selection.resolution} />
      <div className="flex flex-wrap gap-1.5">
        <select aria-label="Modelo de imagem" className={pill} value={selection.model} disabled={pending} onChange={(event) => {
          const next = options.find((item) => item.model === event.target.value);
          if (next) setSelection({ model: next.model, resolution: next.configurations.find((item) => item.resolution === selection.resolution)?.resolution ?? next.configurations[0]?.resolution ?? "" });
        }}>
          {options.map((item) => <option key={item.model} value={item.model} disabled={!item.configurations.length}>{item.name}</option>)}
        </select>
        <select aria-label="Qualidade da imagem" className={pill} value={selection.resolution} disabled={pending} onChange={(event) => setSelection({ ...selection, resolution: event.target.value })}>
          {option?.configurations.map((item) => <option key={item.resolution} value={item.resolution}>{item.resolution === "default" ? "Qualidade padrão" : item.resolution} · {rateText(item.brl)}</option>)}
        </select>
        <span className="flex h-8 items-center rounded-full bg-lab-surface-2 px-3 text-[13px]">a partir do retrato de frente</span>
      </div>
      <details className="text-body-sm">
        <summary className="min-h-11 cursor-pointer content-center text-lab-text-dim">Direção da cena</summary>
        <Textarea id={promptId} aria-label="Direção da cena" name="prompt" defaultValue={prompt} required maxLength={option?.maxPrompt ?? 2000} disabled={pending} className="mt-1" />
      </details>
      {blockedReason ? <Alert variant="warning" title={blockedReason} compact /> : null}
      <CostConfirm costBrl={configuration?.brl} balanceBrl={balanceBrl} label={label} eyebrow={`Confirmar imagem · ${option?.name ?? ""}`} detail="previstos para uma imagem com o rosto dela" disabled={!!blockedReason} pending={pending} />
      {state.error ? <Alert variant="error" title={state.error} compact /> : null}
    </form>
  );
}
