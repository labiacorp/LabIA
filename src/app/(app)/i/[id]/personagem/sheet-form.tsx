"use client";

import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CostChip } from "@/components/ui/cost-chip";
import { Field, Select } from "@/components/ui/field";
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

const price = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 4 });

// Pick the model and quality for the sheet. The price shown is sent back and recomputed on the server: if it differs, nothing is charged.
export function SheetForm({ action, intent, options, initial, prompt, label, variant = "primary", blockedReason, balanceBrl }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [selection, setSelection] = useState(initial);
  const option = options.find((item) => item.model === selection.model);
  const configuration = option?.configurations.find((item) => item.resolution === selection.resolution);
  const insufficient = !!configuration && balanceBrl + 1e-9 < configuration.brl;
  return (
    <form action={formAction} className="grid gap-3" aria-busy={pending}>
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="expectedBrl" value={configuration?.brl ?? ""} />
      <input type="hidden" name="model" value={selection.model} />
      <input type="hidden" name="resolution" value={selection.resolution} />
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
        <summary className="cursor-pointer">Ver o prompt que será enviado</summary>
        <p className="mt-2 whitespace-pre-wrap break-words">{prompt}</p>
        {option ? <p className="mt-2"><a href={option.source} target="_blank" rel="noreferrer" className="underline">Página do modelo na fal.ai</a></p> : null}
      </details>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant={variant} loading={pending} disabled={!!blockedReason || !configuration || insufficient}>{label}</Button>
        <CostChip state={configuration ? "estimated" : "unavailable"} value={configuration?.brl} prefix="custo" />
      </div>
      {insufficient ? <p className="text-caption text-lab-warning">Saldo insuficiente para esta ficha.</p> : null}
      {blockedReason ? <p className="text-caption text-lab-warning">{blockedReason}</p> : null}
      {state.error ? <Alert variant="error" title={state.error} /> : null}
    </form>
  );
}
