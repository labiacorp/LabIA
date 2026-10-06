"use client";

import { useActionState, useId, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/track";
import { CostChip } from "@/components/ui/cost-chip";
import { Field, Select, Textarea } from "@/components/ui/field";
import type { getImageOptions } from "@/lib/content-generation";
import type { ContentState } from "./actions";

export function SceneForm({ action, intent, options, balanceBrl, prompt, blockedReason, label = "Aprovar custo e gerar imagem", fieldLabel = "Cena", description = "O retrato de frente será usado como referência para manter o rosto." }: {
  action: (previous: ContentState, data: FormData) => Promise<ContentState>;
  intent: string;
  options: ReturnType<typeof getImageOptions>;
  balanceBrl: number;
  prompt: string;
  blockedReason?: string;
  label?: string;
  fieldLabel?: string;
  description?: string;
}) {
  const promptId = useId();
  const [state, formAction, pending] = useActionState(action, {});
  const first = options.find((item) => item.configurations.length);
  const [selection, setSelection] = useState({ model: first?.model ?? "", resolution: first?.configurations.find((item) => item.resolution === "1K")?.resolution ?? first?.configurations[0]?.resolution ?? "" });
  const option = options.find((item) => item.model === selection.model);
  const configuration = option?.configurations.find((item) => item.resolution === selection.resolution);
  const insufficient = !!configuration && balanceBrl + 1e-9 < configuration.brl;
  const price = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 4 });
  return (
    <form action={formAction} className="mt-4 grid gap-3" aria-busy={pending}>
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="expectedBrl" value={configuration?.brl ?? ""} />
      <input type="hidden" name="model" value={selection.model} />
      <input type="hidden" name="resolution" value={selection.resolution} />
      <Field label="Modelo de imagem" htmlFor="image-model">
        <Select id="image-model" className="h-11" value={selection.model} disabled={pending} onChange={(event) => {
          const next = options.find((item) => item.model === event.target.value);
          if (next) setSelection({ model: next.model, resolution: next.configurations.find((item) => item.resolution === selection.resolution)?.resolution ?? next.configurations[0]?.resolution ?? "" });
        }}>
          {options.map((item) => <option key={item.model} value={item.model} disabled={!item.configurations.length}>{item.name}</option>)}
        </Select>
      </Field>
      <Field label="Qualidade da imagem" htmlFor="image-quality">
        <Select id="image-quality" className="h-11" value={selection.resolution} disabled={pending} onChange={(event) => setSelection({ ...selection, resolution: event.target.value })}>
          {option?.configurations.map((item) => <option key={item.resolution} value={item.resolution}>{item.resolution === "default" ? "Definida pelo modelo" : item.resolution} · {price.format(item.brl)}/imagem</option>)}
        </Select>
      </Field>
      {option ? <details className="text-caption text-lab-text-dim"><summary className="cursor-pointer">Detalhes do preço</summary><p className="mt-2">Uma imagem com o retrato do personagem como referência. <a href={option.source} target="_blank" rel="noreferrer" className="underline">Fonte fal.ai</a> · Conferido em 04/10/2026.</p></details> : null}
      <Field label={fieldLabel} htmlFor={promptId} description={description}>
        <Textarea id={promptId} name="prompt" defaultValue={prompt} required maxLength={option?.maxPrompt ?? 2000} disabled={pending} />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="cost" onClick={() => track("generate_clicked", { kind: "image", estimate_brl: configuration?.brl ?? 0 })} loading={pending} disabled={!!blockedReason || !configuration || insufficient}>{label}</Button>
        <CostChip state={configuration ? "estimated" : "unavailable"} value={configuration?.brl} prefix="total estimado" />
      </div>
      {insufficient ? <p className="text-caption text-lab-warning">Saldo insuficiente para esta imagem.</p> : null}
      {blockedReason ? <p className="text-caption text-lab-warning">{blockedReason}</p> : null}
      {state.error ? <Alert variant="error" title={state.error} /> : null}
    </form>
  );
}
