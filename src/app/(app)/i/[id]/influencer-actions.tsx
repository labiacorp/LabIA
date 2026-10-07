"use client";

import { useActionState, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { deleteInfluencer, editInfluencer, type InfluencerState } from "../../influenciadores/nova/actions";
import { NICHES } from "../../influenciadores/nova/niches";

const field = "rounded-control border-[1.5px] border-lab-border-strong bg-lab-surface-2 px-4 text-body focus-visible:border-lab-text focus-visible:outline-none";

export function EditInfluencer({ influencer }: { influencer: { id: string; name: string; niche: string; description: string } }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(async (previous: InfluencerState, form: FormData) => {
    const result = await editInfluencer(influencer.id, previous, form);
    if (!result.error) dialog.current?.close();
    return result;
  }, {});
  const niches = NICHES.includes(influencer.niche) ? NICHES : [influencer.niche, ...NICHES];
  return <>
    <button type="button" onClick={() => dialog.current?.showModal()} className="h-12 rounded-full border-[1.5px] border-lab-border-strong px-4 text-[15px] font-semibold">Editar</button>
    <Modal dialog={dialog} label="Editar influencer">
      <h2 className="font-display text-[36px] font-black uppercase leading-[.95]">Editar</h2>
      <form action={action} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2"><span className="text-body-sm font-medium">Nome</span><input name="name" defaultValue={influencer.name} required maxLength={60} className={`h-[52px] ${field}`} /></label>
        <fieldset className="flex flex-col gap-2"><legend className="mb-2 text-body-sm font-medium">Nicho</legend><div className="flex flex-wrap gap-2">
          {niches.map((niche) => <label key={niche} className="flex h-11 cursor-pointer items-center rounded-full bg-lab-surface-2 px-4 text-body-sm font-medium has-[:checked]:bg-lab-text has-[:checked]:text-lab-bg"><input type="radio" name="niche" value={niche} defaultChecked={niche === influencer.niche} className="sr-only" />{niche}</label>)}
        </div></fieldset>
        <label className="flex flex-col gap-2"><span className="text-body-sm font-medium">Como ela é</span><textarea name="description" defaultValue={influencer.description} required minLength={20} maxLength={400} rows={4} className={`py-3.5 leading-[1.5] ${field}`} /></label>
        <p className="text-[13px] text-lab-text-dim">Vale para as próximas gerações. O que já foi gerado não muda. Nada é cobrado.</p>
        <Button className="h-14 text-body" loading={pending}>Salvar</Button>
        <button type="button" onClick={() => dialog.current?.close()} className="h-12 rounded-full border-[1.5px] border-lab-border-strong text-[15px] font-semibold">Cancelar</button>
        {state.error ? <Alert variant="error" title={state.error} /> : null}
      </form>
    </Modal>
  </>;
}

export function DeleteInfluencer({ influencer, contents, files, spent }: { influencer: { id: string; name: string }; contents: number; files: number; spent: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");
  const [state, action, pending] = useActionState(deleteInfluencer.bind(null, influencer.id), {} as InfluencerState);
  const word = influencer.name.trim().toLowerCase();
  const ok = typed.trim().toLowerCase() === word;
  return <>
    <button type="button" onClick={() => dialog.current?.showModal()} className="flex h-12 items-center gap-1.5 rounded-full border-[1.5px] border-lab-border-strong px-4 text-[15px] font-semibold text-lab-danger"><Trash2 className="size-4" aria-hidden />Excluir</button>
    <Modal dialog={dialog} label={`Excluir a ${influencer.name}?`} tone="danger">
      <span className="flex size-11 items-center justify-center rounded-control bg-lab-danger text-lab-on-reagent"><Trash2 className="size-[22px]" aria-hidden /></span>
      <h2 className="font-display text-[36px] font-black uppercase leading-[.95]">Excluir a {influencer.name}?</h2>
      <p className="text-[15px] leading-[1.55] text-lab-text-dim">Apaga {contents} {contents === 1 ? "conteúdo" : "conteúdos"} e {files} {files === 1 ? "arquivo" : "arquivos"} da biblioteca. O que você já gastou ({spent}) continua no extrato. Não dá para desfazer.</p>
      <form action={action} className="flex flex-col gap-2">
        <label className="flex flex-col gap-2"><span className="text-body-sm">Digite <span className="rounded bg-lab-surface-2 px-1.5 py-0.5 font-mono">{word}</span> para confirmar</span>
          <input name="confirm" value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" className={`h-[52px] ${field}`} /></label>
        <button type="button" onClick={() => dialog.current?.close()} className="mt-2 h-[52px] rounded-full border-[1.5px] border-lab-border-strong text-[15px] font-semibold">Cancelar</button>
        <button disabled={!ok || pending} className="h-[52px] rounded-full bg-lab-danger text-[15px] font-semibold text-lab-on-reagent disabled:bg-lab-surface-2 disabled:text-lab-text-disabled">{pending ? "Excluindo…" : "Excluir para sempre"}</button>
      </form>
      {state.error ? <Alert variant="error" title={state.error} /> : null}
    </Modal>
  </>;
}
