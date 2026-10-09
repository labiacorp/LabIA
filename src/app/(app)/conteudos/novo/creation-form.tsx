"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Check, CircleAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { CostChip } from "@/components/ui/cost-chip";
import { chargeBrl, costCredits, creditsText } from "@/lib/plan";
import { TEXT_MAX } from "@/lib/limits";
import { createProduction } from "../management";
import { SceneForm } from "../../i/[id]/c/[contentId]/scene-form";
import { VideoForm, type VideoFormOption } from "../../i/[id]/c/[contentId]/video-form";
import type { DraftSettings } from "@/lib/content-draft";
import type { getImageOptions } from "@/lib/content-generation";

const unusedAction = async () => ({});

type Row = { step: string; model: string; brl: number };

export function CreationForm({ influencers, selected, initial, rows, totalBrl, imageOptions, videoOptions, draft }: {
  influencers: { id: string; name: string; face?: string }[];
  selected: string;
  initial?: { title: string; idea: string; script: string; aspectRatio: string };
  rows: Row[];
  totalBrl: number;
  imageOptions: Record<string, ReturnType<typeof getImageOptions>>;
  videoOptions: VideoFormOption[];
  draft?: { id: string; influencerId: string; settings: DraftSettings };
}) {
  const [state, action, pending] = useActionState(createProduction, { error: "" });
  const [aspectRatio, setAspectRatio] = useState(initial?.aspectRatio ?? "9:16");
  const [image, setImage] = useState<DraftSettings["image"]>();
  const [video, setVideo] = useState<DraftSettings["video"]>();
  const selectedRows = rows.map((row) => row.step === "Imagem" && image ? { ...row, model: imageOptions[aspectRatio].find((item) => item.model === image.model)?.name ?? image.model, brl: image.brl }
    : row.step === "Vídeo" && video ? { ...row, model: videoOptions.find((item) => item.model === video.model && item.strategy === video.strategy)?.name ?? video.model, brl: video.brl } : row);
  const estimate = image && video ? selectedRows.reduce((sum, row) => sum + chargeBrl(row.brl), 0) : totalBrl;
  if (state.created) return <div className="flex flex-col gap-4">
    <span className="flex size-[52px] items-center justify-center rounded-control bg-lab-text text-lab-bg"><Check className="size-[26px]" aria-hidden /></span>
    <h1 className="font-display text-[30px] font-black uppercase leading-[.9] lg:text-[40px]">{draft ? "Settings saved" : "Conteúdo criado"}</h1>
    <p className="text-[15px] leading-[1.5] text-lab-text-dim">Nada foi cobrado. A primeira etapa, o roteiro, é grátis.</p>
    <Link href={state.created} className={buttonVariants({ className: "h-12 max-w-[400px] text-body" })}>{draft ? "Back to content" : "Escrever roteiro"}</Link>
  </div>;
  return <form action={action} className="flex flex-col gap-6">
    <h1 className="font-display text-[30px] font-black uppercase leading-[.9] lg:text-[40px]">{draft ? "Edit content settings" : "Novo conteúdo"}</h1>
    {draft ? <><input type="hidden" name="contentId" value={draft.id} /><input type="hidden" name="influencerId" value={draft.influencerId} /></> : null}
    {initial?.title ? <input type="hidden" name="title" value={initial.title} /> : null}
    {initial?.script ? <input type="hidden" name="script" value={initial.script} /> : null}
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-body-sm font-medium">Influencer</legend>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {influencers.map((item) => <label key={item.id} className="flex h-[52px] shrink-0 cursor-pointer items-center gap-2.5 rounded-full bg-lab-surface-2 pl-1.5 pr-4 text-body-sm font-medium has-[:checked]:shadow-[inset_0_0_0_2px_var(--lab-text)] has-[:focus-visible]:shadow-lab-focus">
          <input type="radio" name="influencerId" value={item.id} defaultChecked={item.id === selected} disabled={!!draft} className="sr-only" />
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
    <label className="grid gap-2 text-body-sm"><span>Format</span><select aria-label="Format" name="aspectRatio" value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)} className="min-h-11 rounded-control border border-lab-border-strong bg-lab-surface-2 px-3"><option value="9:16">9:16 · Portrait</option><option value="16:9">16:9 · Landscape</option><option value="1:1">1:1 · Square</option></select></label>
    <fieldset className="grid min-w-0 gap-3"><legend className="mb-3 text-body-sm font-medium">Image settings</legend><SceneForm key={aspectRatio} settingsOnly action={unusedAction} intent="" prompt="" balanceBrl={0} options={imageOptions[aspectRatio]} initial={image ?? draft?.settings.image} onSelectionChange={setImage} /></fieldset>
    <fieldset className="grid min-w-0 gap-3"><legend className="mb-3 text-body-sm font-medium">Video settings</legend><VideoForm settingsOnly action={unusedAction} intent="" prompt="" balanceBrl={0} options={videoOptions} initial={draft?.settings.video} onSelectionChange={setVideo} /></fieldset>
    <div className="flex flex-col rounded-card bg-lab-surface-1 p-4 shadow-[inset_0_0_0_1px_var(--lab-border)]">
      <span className="pb-1.5 font-mono text-caption uppercase tracking-[.1em] text-lab-text-dim">Custo previsto por etapa</span>
      {selectedRows.map((row) => <div key={row.step} className="flex min-h-10 items-center justify-between gap-3 border-b border-lab-border text-body-sm"><span className="min-w-0 break-words">{row.step} <span className="text-lab-text-dim">· {row.model}</span></span>{row.brl > 0 ? <CostChip size="sm" state="estimated" value={row.brl} /> : <CostChip size="sm" state="free" value={0} />}</div>)}
      <div className="flex items-baseline justify-between pt-3"><span className="font-semibold">Total previsto</span><span className="font-display text-[40px] font-black leading-[.9] text-lab-reagent-bright">~{creditsText(costCredits(estimate))}</span></div>
      <span className="pt-2 text-[13px] text-lab-text-dim">Criar é grátis. Você confirma os créditos de cada etapa na hora de gerar.</span>
    </div>
    <Button type="submit" className="h-12 text-body" loading={pending}>{draft ? "Save settings · free" : "Criar conteúdo · grátis"}</Button>
  </form>;
}
