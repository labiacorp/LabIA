"use client";

import { useActionState, useRef } from "react";
import { Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { approveStep, deleteContent } from "./management-actions";
import type { ContentState } from "./actions";

export function ApproveButton({ influencerId, contentId, stepId, label }: { influencerId: string; contentId: string; stepId: string; label: string }) {
  const [state, action, pending] = useActionState(approveStep.bind(null, influencerId, contentId, stepId), { error: "", message: "" });
  return <form action={action} className="flex flex-1 flex-col gap-2">
    <Button className="h-12 w-full text-[15px]" loading={pending}>{label}</Button>
    {state.error ? <Alert variant="error" title={state.error} compact /> : null}
  </form>;
}

// Montagem costs nothing, so it gets a plain button, never the lime cost one.
export function AssembleButton({ action, intent, blockedReason }: { action: (previous: ContentState, data: FormData) => Promise<ContentState>; intent: string; blockedReason?: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction} className="flex flex-col gap-2">
    <input type="hidden" name="intent" value={intent} />
    <input type="hidden" name="expectedBrl" value={0} />
    <Button className="h-12 w-full text-body" loading={pending} disabled={!!blockedReason}>Montar vídeo · grátis</Button>
    {blockedReason ? <p className="text-caption text-lab-text-dim">{blockedReason}</p> : null}
    {state.error ? <Alert variant="error" title={state.error} compact /> : null}
  </form>;
}

export function DeleteContentButton({ influencerId, contentId, stages, spent, running }: { influencerId: string; contentId: string; stages: number; spent: string; running: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(deleteContent.bind(null, influencerId, contentId), { error: "", message: "" });
  return <>
    <button type="button" aria-label="Excluir conteúdo" onClick={() => dialog.current?.showModal()} className="ml-auto flex size-11 items-center justify-center rounded-full bg-lab-surface-2 focus-visible:outline-none focus-visible:shadow-lab-focus"><Trash2 className="size-[18px]" aria-hidden /></button>
    <Modal dialog={dialog} label="Excluir este conteúdo?" tone="danger">
      <span className="flex size-11 items-center justify-center rounded-control bg-lab-danger text-lab-on-reagent"><Trash2 className="size-[22px]" aria-hidden /></span>
      <h2 className="font-display text-[36px] font-black uppercase leading-[.95]">Excluir este conteúdo?</h2>
      <p className="text-[15px] leading-[1.55] text-lab-text-dim">{running ? "Uma geração está em andamento. Espere terminar para excluir." : `Apaga as ${stages} etapas e os arquivos gerados. Os ${spent} já gastos continuam no extrato. Não dá para desfazer.`}</p>
      <form action={action} className="flex flex-col gap-2">
        <button type="button" onClick={() => dialog.current?.close()} className="h-[52px] rounded-full border-[1.5px] border-lab-border-strong text-[15px] font-semibold">Cancelar</button>
        <button disabled={running || pending} className="h-[52px] rounded-full bg-lab-danger text-[15px] font-semibold text-lab-on-reagent disabled:bg-lab-surface-2 disabled:text-lab-text-disabled">{pending ? "Excluindo…" : "Excluir conteúdo"}</button>
      </form>
      {state.error ? <Alert variant="error" title={state.error} compact /> : null}
    </Modal>
  </>;
}
