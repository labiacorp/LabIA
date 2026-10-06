"use client";

import { rateText } from "@/lib/plan";
import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CostChip } from "@/components/ui/cost-chip";
import { Field, Select, Textarea } from "@/components/ui/field";
import type { getSheetOptions, SheetSelection } from "@/lib/character";
import { qualityLabel } from "@/lib/providers/image-models";
import type { KitState } from "../kit-actions";

type Props = {
  action: (previous: KitState, data: FormData) => Promise<KitState>;
  intent: string;
  options: ReturnType<typeof getSheetOptions>;
  initial: SheetSelection;
  prompt: string;
  label: string;
  variant?: "primary" | "secondary";
  blockedReason?: string;
  balanceBrl: number;
};

const price = { format: rateText };

// Pick the model and quality for the sheet. The price shown is sent back and recomputed on the server: if it differs, nothing is charged.
export function SheetForm({ action, intent, options, initial, prompt, label, variant = "primary", blockedReason, balanceBrl }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [selection, setSelection] = useState(initial);
  const [text, setText] = useState(prompt);
  const option = options.find((item) => item.model === selection.model);
  const configuration = option?.configurations.find((item) => item.resolution === selection.resolution);
  const insufficient = !!configuration && balanceBrl + 1e-9 < configuration.brl;
  const limit = option?.maxPrompt ?? 4000;
  const tooLong = text.length > limit;
  return (
    <form action={formAction} className="grid gap-3" aria-busy={pending}>
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="expectedBrl" value={configuration?.brl ?? ""} />
      <input type="hidden" name="model" value={selection.model} />
      <input type="hidden" name="resolution" value={selection.resolution} />
      <input type="hidden" name="prompt" value={text === prompt ? "" : text} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Modelo da ficha" htmlFor="sheet-model">
          <Select id="sheet-model" className="h-11" value={selection.model} disabled={pending} onChange={(event) => {
            const next = options.find((item) => item.model === event.target.value);
            if (next) setSelection({ model: next.model, resolution: next.configurations.find((item) => item.resolution === selection.resolution)?.resolution ?? next.configurations[0]?.resolution ?? "" });
          }}>
            {options.map((item) => <option key={item.model} value={item.model} disabled={!item.configurations.length}>{item.name}{item.estimated ? " · preço estimado" : ""}</option>)}
          </Select>
        </Field>
        <Field label="Qualidade" htmlFor="sheet-quality">
          <Select id="sheet-quality" className="h-11" value={selection.resolution} disabled={pending} onChange={(event) => setSelection({ ...selection, resolution: event.target.value })}>
            {option?.configurations.map((item) => <option key={item.resolution} value={item.resolution}>{qualityLabel(item.resolution)} · {price.format(item.brl)}</option>)}
          </Select>
        </Field>
      </div>
      <details className="text-caption text-lab-text-dim">
        <summary className="cursor-pointer">Ver e editar o prompt que será enviado{text !== prompt ? " · editado" : ""}</summary>
        <Textarea aria-label="Prompt da ficha" className="mt-2 min-h-48" rows={10} value={text} disabled={pending} aria-invalid={tooLong} onChange={(event) => setText(event.target.value)} />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className={tooLong ? "text-lab-danger" : undefined}>{text.length} / {limit} caracteres{tooLong ? " · acima do limite deste modelo" : ""}</span>
          {text !== prompt ? <button type="button" className="underline" onClick={() => setText(prompt)}>Voltar ao prompt padrão</button> : null}
        </div>
        {option ? <p className="mt-2"><a href={option.source} target="_blank" rel="noreferrer" className="underline">Página do modelo na fal.ai</a></p> : null}
      </details>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant={variant} loading={pending} disabled={!!blockedReason || !configuration || insufficient || tooLong || !text.trim()}>{label}</Button>
        <CostChip state={configuration ? "estimated" : "unavailable"} value={configuration?.brl} prefix="custo" />
      </div>
      {insufficient ? <p className="text-caption text-lab-warning">Créditos insuficientes para esta ficha.</p> : null}
      {blockedReason ? <p className="text-caption text-lab-warning">{blockedReason}</p> : null}
      {state.error ? <Alert variant="error" title={state.error} /> : null}
    </form>
  );
}
