"use client";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reconcileStep, topUp, type AdminState } from "./actions";

const initial: AdminState = { ok: false, message: "" };
const Result = ({ state }: { state: AdminState }) =>
  state.message ? <p role={state.ok ? "status" : "alert"} className={`text-caption ${state.ok ? "text-lab-success" : "text-lab-danger"}`}>{state.message}</p> : null;

export function TopUpForm({ userId, email }: { userId: string; email: string }) {
  const [state, action, pending] = useActionState(topUp, initial);
  // Two steps: "Revisar" restates amount and account and mints the operation key; "Confirmar" sends.
  // A double click or retry of that same confirmation reuses the key, so the server credits once.
  // The review belongs to the result it was opened after, so a new result closes it on its own.
  const [opened, setOpened] = useState<{ amount: string; key: string; after: AdminState } | null>(null);
  const review = opened?.after === state ? opened : null;
  return <form action={action} onSubmit={(event) => { if (!review) { event.preventDefault(); setOpened({ amount: String(new FormData(event.currentTarget).get("amount")), key: crypto.randomUUID(), after: state }); } }} className="mt-3 grid gap-2 sm:grid-cols-[8rem_1fr_auto] sm:items-end">
    <input type="hidden" name="userId" value={userId} /><input type="hidden" name="key" value={review?.key ?? ""} />
    <label className="grid gap-1 text-caption">Valor (R$)<Input name="amount" type="number" inputMode="decimal" step="0.01" min="0.01" max="1000" required readOnly={!!review} /></label>
    <label className="grid gap-1 text-caption">Nota<Input name="note" required minLength={3} maxLength={200} placeholder="Ex.: crédito de teste da beta" readOnly={!!review} /></label>
    <Button type="submit" variant={review ? "primary" : "secondary"} loading={pending}>{review ? "Confirmar" : "Revisar"}</Button>
    <div className="sm:col-span-3">{review ? <p className="text-caption text-lab-text-dim">Adicionar R$ {review.amount} ao saldo de {email}? <button type="button" className="underline" onClick={() => setOpened(null)}>Editar</button></p> : <Result state={state} />}</div>
  </form>;
}

export function ReconcileForm({ stepId, video }: { stepId: string; video: boolean }) {
  const [state, action, pending] = useActionState(reconcileStep, initial);
  return <form action={action} className="mt-3 flex flex-wrap items-end gap-2">
    <input type="hidden" name="stepId" value={stepId} />
    <label className="grid gap-1 text-caption">{video ? "Custo total verificado (R$)" : "Custo verificado (R$)"}<Input name="actualBrl" type="number" inputMode="decimal" step="0.0001" min="0" required /></label>
    <Button type="submit" variant="secondary" loading={pending}>Reconciliar</Button>
    <div className="w-full"><Result state={state} /></div>
  </form>;
}
