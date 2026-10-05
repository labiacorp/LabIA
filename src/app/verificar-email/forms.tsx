"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resendVerification, verifyCode } from "./actions";

export function CodeForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(verifyCode, { error: "" });
  return <form action={action} className="grid gap-3">
    <label className="grid gap-2 text-caption">E-mail<Input name="email" type="email" required autoComplete="email" defaultValue={email} /></label>
    <label className="grid gap-2 text-caption">Código<Input name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} placeholder="000000" className="font-mono tracking-[0.3em]" /></label>
    <Button size="lg" loading={pending}>Confirmar</Button>
    {state.error ? <p role="alert" className="text-body-sm text-lab-danger">{state.error}</p> : null}
  </form>;
}

export function ResendForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendVerification, { error: "" });
  return <form action={action} className="grid gap-2 border-t border-lab-border pt-5">
    <input type="hidden" name="email" value={email} />
    <p className="text-body-sm text-lab-text-dim">Não chegou? Confira o spam ou peça outro.</p>
    <Button type="submit" variant="secondary" loading={pending} disabled={!email}>Enviar de novo</Button>
    {state.error ? <p role="alert" className="text-body-sm text-lab-danger">{state.error}</p> : state.message ? <p role="status" className="text-body-sm text-lab-text-dim">{state.message}</p> : null}
  </form>;
}
