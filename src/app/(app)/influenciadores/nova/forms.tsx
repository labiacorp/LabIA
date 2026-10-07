"use client";

import { useActionState, useState } from "react";
import { Check, CircleAlert } from "lucide-react";
import { CostConfirm } from "@/components/app/cost-confirm";
import { ModelSelect, type ModelOption } from "@/components/app/model-select";
import { Alert } from "@/components/ui/alert";
import { approveFace, createInfluencer, regeneratePreviews, type InfluencerState } from "./actions";
import { NICHES } from "./niches";

const field = "rounded-control border-[1.5px] bg-lab-surface-2 px-4 text-body text-lab-text placeholder:text-lab-text-dim focus-visible:border-lab-text focus-visible:outline-none";

// Nova influencer · 1 de 2 ("Quem é ela?"), from the design. The previews are the only charge on this screen.
export function BriefForm({ intent, choices, defaultModel, balanceBrl }: { intent: string; choices: ModelOption[]; defaultModel: string; balanceBrl: number }) {
  const [model, setModel] = useState(choices.some((item) => item.model === defaultModel) ? defaultModel : (choices[0]?.model ?? ""));
  const previewBrl = choices.find((item) => item.model === model)?.brl ?? 0;
  const [state, action, pending] = useActionState(createInfluencer, {} as InfluencerState);
  const [description, setDescription] = useState("");
  const short = description.trim().length > 0 && description.trim().length < 20;
  return <form action={action} className="flex flex-col gap-6">
    <input type="hidden" name="intent" value={intent} />
    <input type="hidden" name="expectedBrl" value={previewBrl} />
    <div className="flex flex-col gap-2"><span className="font-mono text-caption uppercase tracking-[.1em] text-lab-text-dim">Nova influencer · 1 de 2</span><h1 className="font-display text-[30px] font-black uppercase leading-[.9] lg:text-[40px]">Quem é ela?</h1></div>
    <label className="flex flex-col gap-2"><span className="text-body-sm font-medium">Nome</span><input name="name" required maxLength={60} placeholder="Ex.: Malu Andrade" className={`h-[52px] ${field} border-lab-border-strong`} /></label>
    <fieldset className="flex flex-col gap-2"><legend className="mb-2 text-body-sm font-medium">Nicho</legend><div className="flex flex-wrap gap-2">
      {NICHES.map((niche, index) => <label key={niche} className="flex h-11 cursor-pointer items-center rounded-full bg-lab-surface-2 px-4 text-body-sm font-medium has-[:checked]:bg-lab-text has-[:checked]:text-lab-bg has-[:focus-visible]:shadow-lab-focus">
        <input type="radio" name="niche" value={niche} defaultChecked={index === 0} className="sr-only" />{niche}</label>)}
    </div></fieldset>
    <label className="flex flex-col gap-2"><span className="text-body-sm font-medium">Como ela é</span>
      <textarea name="description" required minLength={20} maxLength={400} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="26 anos, cabelo cacheado castanho, sardas leves, sorriso largo, estilo casual com tons terrosos." className={`min-h-28 py-3.5 leading-[1.5] ${field} ${short ? "border-lab-danger" : "border-lab-border-strong"}`} />
      <span className={`flex justify-between text-[13px] ${short ? "text-lab-danger" : "text-lab-text-dim"}`}><span>{short ? "Descreva com pelo menos 20 caracteres: idade, cabelo, estilo." : "Quanto mais detalhe, menos prévias você precisa gerar."}</span><span className="font-mono">{description.length} / 400</span></span>
    </label>
    <div className="flex flex-col gap-3 rounded-card bg-lab-surface-1 p-4 shadow-[inset_0_0_0_1px_var(--lab-border)]">
      <span className="text-[15px] font-semibold">Prévia do rosto</span>
      <span className="text-[13px] leading-[1.5] text-lab-text-dim">4 opções de rosto. Você escolhe uma ou gera de novo. Ao aprovar, a ficha de referência dela é gerada com a confirmação do custo.</span>
      <ModelSelect label="Image model" options={choices} value={model} onChange={setModel} hint="The price covers all 4 options." />
      <CostConfirm costBrl={previewBrl} balanceBrl={balanceBrl} label="Gerar prévia" eyebrow="Confirmar prévia do rosto · 4 opções" detail="previstos para 4 opções de rosto" pending={pending} />
    </div>
    {state.error ? <p role="alert" className="flex items-center gap-1.5 text-[13px] text-lab-danger"><CircleAlert className="size-3.5" aria-hidden />{state.error}</p> : null}
  </form>;
}

type Face = { id: string; url: string | null; status: string };

// Nova influencer · 2 de 2 ("Escolha o rosto"). Approving opens the cost confirm for the character sheet.
export function ChooseFace({ influencerId, faces, sheetChoices, previewChoices, balanceBrl, approveIntent, againIntent, running }: {
  influencerId: string; faces: Face[]; sheetChoices: ModelOption[]; previewChoices: ModelOption[]; balanceBrl: number; approveIntent: string; againIntent: string; running: boolean;
}) {
  const [sheetModel, setSheetModel] = useState(sheetChoices.find((item) => item.model === "fal-ai/nano-banana-2/edit")?.model ?? sheetChoices[0]?.model ?? "");
  const [previewModel, setPreviewModel] = useState(previewChoices.find((item) => item.model === "bytedance/seedream/v5/lite/text-to-image")?.model ?? previewChoices[0]?.model ?? "");
  const sheetBrl = sheetChoices.find((item) => item.model === sheetModel)?.brl ?? 0;
  const previewBrl = previewChoices.find((item) => item.model === previewModel)?.brl ?? 0;
  const ready = faces.filter((face) => face.url);
  const [chosen, setChosen] = useState<string>("");
  const [approveState, approve, approving] = useActionState(approveFace.bind(null, influencerId), {} as InfluencerState);
  const [againState, again, regenerating] = useActionState(regeneratePreviews.bind(null, influencerId), {} as InfluencerState);
  const index = ready.findIndex((face) => face.id === chosen);
  return <div className="flex flex-col gap-6">
    <div className="grid max-w-[440px] grid-cols-2 gap-2.5" role="radiogroup" aria-label="Opções de rosto">
      {faces.map((face, n) => face.url
        ? <button key={face.id} type="button" role="radio" aria-checked={chosen === face.id} onClick={() => setChosen(face.id)}
            className={`relative aspect-[4/5] overflow-hidden rounded-control focus-visible:outline-none focus-visible:shadow-lab-focus ${chosen === face.id ? "shadow-[inset_0_0_0_2.5px_var(--lab-text)]" : "shadow-[inset_0_0_0_1px_var(--lab-border)]"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={face.url} alt={`Opção ${n + 1}`} className="absolute inset-0 size-full object-cover" />
            <span className="absolute bottom-2 left-2 rounded bg-lab-bg/70 px-1 font-mono text-[11px] text-lab-text-dim">opção {n + 1}</span>
            {chosen === face.id ? <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-lab-text text-lab-bg"><Check className="size-4" aria-hidden /></span> : null}
          </button>
        : <span key={face.id} className={`relative aspect-[4/5] rounded-control ${face.status === "RUNNING" ? "animate-lab-shimmer bg-[linear-gradient(90deg,var(--lab-surface-2),var(--lab-surface-3),var(--lab-surface-2))] bg-[length:200%_100%]" : "lab-placeholder-media"}`}>
            <span className="absolute bottom-2 left-2 font-mono text-[11px] text-lab-text-dim">{face.status === "RUNNING" ? "gerando…" : face.status === "FAILED" ? "falhou · estornado" : `opção ${n + 1}`}</span>
          </span>)}
    </div>
    <div className="flex max-w-[440px] flex-col gap-2">
      <form action={approve} className="flex flex-col gap-2">
        <input type="hidden" name="intent" value={approveIntent} />
        <input type="hidden" name="expectedBrl" value={sheetBrl} />
        <input type="hidden" name="asset" value={chosen} />
        <ModelSelect label="Sheet model" options={sheetChoices} value={sheetModel} onChange={setSheetModel} hint="The price includes the side portrait." />
        <CostConfirm costBrl={sheetBrl} balanceBrl={balanceBrl} label={index >= 0 ? `Aprovar opção ${index + 1}` : "Escolha um rosto"} eyebrow="Confirmar rosto · ficha de referência" detail="previstos para a ficha que mantém o rosto dela igual em todos os vídeos" disabled={index < 0 || running} pending={approving} />
        {approveState.error ? <Alert variant="error" title={approveState.error} /> : null}
      </form>
      <form action={again} className="flex flex-col gap-2">
        <input type="hidden" name="intent" value={againIntent} />
        <input type="hidden" name="expectedBrl" value={previewBrl} />
        <ModelSelect label="Model for the new options" options={previewChoices} value={previewModel} onChange={setPreviewModel} />
        <CostConfirm variant="secondary" costBrl={previewBrl} balanceBrl={balanceBrl} label="Gerar outras 4" eyebrow="Confirmar prévia do rosto · 4 opções" detail="previstos para 4 novas opções de rosto" disabled={running} pending={regenerating} />
        {againState.error ? <Alert variant="error" title={againState.error} /> : null}
      </form>
    </div>
  </div>;
}
