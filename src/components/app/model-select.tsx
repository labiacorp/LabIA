"use client";

import { costText } from "@/lib/plan";

export type ModelOption = { model: string; name: string; brl: number };

// The model picker for flows that charge one fixed amount per model: name and credits in each row; the server recomputes the price.
export function ModelSelect({ options, value, onChange, label, hint }: {
  options: ModelOption[]; value: string; onChange: (model: string) => void; label: string; hint?: string;
}) {
  return <label className="flex flex-col gap-1.5">
    <span className="text-body-sm font-medium">{label}</span>
    <select name="model" value={value} onChange={(event) => onChange(event.target.value)}
      className="h-11 rounded-control border-[1.5px] border-lab-border-strong bg-lab-surface-2 px-3 text-body-sm text-lab-text focus-visible:border-lab-text focus-visible:outline-none">
      {options.map((item) => <option key={item.model} value={item.model}>{item.name} · {costText(item.brl)}</option>)}
    </select>
    {hint ? <span className="text-[13px] text-lab-text-dim">{hint}</span> : null}
  </label>;
}
