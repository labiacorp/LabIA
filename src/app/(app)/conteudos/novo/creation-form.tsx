"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Check, CircleAlert, Smartphone, Timer } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { CostChip } from "@/components/ui/cost-chip";
import { costCredits, creditsText } from "@/lib/plan";
import { TEXT_MAX } from "@/lib/limits";
import { createProduction } from "../management";

type Row = { step: string; model: string; brl: number };

export function CreationForm({ influencers, selected, initial, rows, totalBrl }: {
  influencers: { id: string; name: string; face?: string }[];
  selected: string;
  initial?: { title: string; idea: string; script: string; aspectRatio: string };
  rows: Row[];
  totalBrl: number;
}) {
  const [state, action, pending] = useActionState(createProduction, { error: "" });
  if (state.created) return <div className="flex flex-col gap-4">
    <span className="flex size-[52px] items-center justify-center rounded-control bg-lab-text text-lab-bg"><Check className="size-[26px]" aria-hidden /></span>
    <h1 className="font-display text-[30px] font-black uppercase leading-[.9] lg:text-[40px]">Conteúdo criado</h1>
    <p className="text-[15px] leading-[1.5] text-lab-text-dim">Nada foi cobrado. A primeira etapa, o roteiro, é grátis.</p>
    <Link href={state.created} className={buttonVariants({ className: "h-12 max-w-[400px] text-body" })}>Escrever roteiro</Link>
  </div>;
  return <form action={action} className="flex flex-col gap-6">
    <h1 className="font-display text-[30px] font-black uppercase leading-[.9] lg:text-[40px]">Novo conteúdo</h1>
    {initial?.title ? <input type="hidden" name="title" value={initial.title} /> : null}
    {initial?.script ? <input type="hidden" name="script" value={initial.script} /> : null}
    {initial?.aspectRatio ? <input type="hidden" name="aspectRatio" value={initial.aspectRatio} /> : null}
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-body-sm font-medium">Influencer</legend>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {influencers.map((item) => <label key={item.id} className="flex h-[52px] shrink-0 cursor-pointer items-center gap-2.5 rounded-full bg-lab-surface-2 pl-1.5 pr-4 text-body-sm font-medium has-[:checked]:shadow-[inset_0_0_0_2px_var(--lab-text)] has-[:focus-visible]:shadow-lab-focus">
          <input type="radio" name="influencerId" value={item.id} defaultChecked={item.id === selected} className="sr-only" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {item.face ? <img src={item.face} alt="" className="size-10 rounded-full object-cover" /> : <span className="size-10 rounded-full bg-[repeating-linear-gradient(135deg,var(--lab-surface-3)_0_5px,var(--lab-border-strong)_5px_10px)]" />}
          {item.name}
        </label>)}
      </div>
    </fieldset>
    <label className="flex flex-col gap-2">
      <span className="text-body-sm font-medium">Ideia do vídeo</span>
      <textarea name="idea" required maxLength={TEXT_MAX} rows={4} defaultValue={initial?.idea ?? ""} placeholder="Ex.: 3 hábitos de quem acorda às 5h, tom leve, gancho nos 2 primeiros segundos."
        aria-invalid={!!state.error} className={`min-h-28 rounded-control border-[1.5px] bg-lab-surface-2 px-4 py-3.5 text-body leading-[1.5] placeholder:text-lab-text-dim focus-visible:border-lab-text focus-visible:outline-none ${state.error ? "border-lab-danger" : "border-lab-border-strong"}`} />
      {state.error ? <span role="alert" className="flex items-center gap-1.5 text-[13px] text-lab-danger"><CircleAlert className="size-3.5" aria-hidden />{state.error}</span> : null}
    </label>
    <div className="flex flex-wrap gap-2">
      <span className="flex h-9 items-center gap-1.5 rounded-full bg-lab-surface-2 px-3 text-[13px]"><Smartphone className="size-[15px]" aria-hidden />{initial?.aspectRatio ?? "9:16"}</span>
      <span className="flex h-9 items-center gap-1.5 rounded-full bg-lab-surface-2 px-3 text-[13px]"><Timer className="size-[15px]" aria-hidden />15 segundos</span>
    </div>
    <div className="flex flex-col rounded-card bg-lab-surface-1 p-4 shadow-[inset_0_0_0_1px_var(--lab-border)]">
      <span className="pb-1.5 font-mono text-caption uppercase tracking-[.1em] text-lab-text-dim">Custo previsto por etapa</span>
      {rows.map((row) => <div key={row.step} className="flex min-h-10 items-center justify-between border-b border-lab-border text-body-sm"><span>{row.step} <span className="text-lab-text-dim">· {row.model}</span></span>{row.brl > 0 ? <CostChip size="sm" state="estimated" value={row.brl} /> : <CostChip size="sm" state="free" value={0} />}</div>)}
      <div className="flex items-baseline justify-between pt-3"><span className="font-semibold">Total previsto</span><span className="font-display text-[40px] font-black leading-[.9] text-lab-reagent-bright">~{creditsText(costCredits(totalBrl))}</span></div>
      <span className="pt-2 text-[13px] text-lab-text-dim">Criar é grátis. Você confirma os créditos de cada etapa na hora de gerar.</span>
    </div>
    <Button type="submit" className="h-12 text-body" loading={pending}>Criar conteúdo · grátis</Button>
  </form>;
}
