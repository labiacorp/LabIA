"use client";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "./actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, { error: "" });
  if (state.sent) return <Alert variant="success" title="Confira seu e-mail">Se houver uma conta com este endereço, o link chega em instantes. Ele vale por 1 hora.</Alert>;
  return <form action={action} className="grid gap-3">
    <label className="grid gap-2 text-caption">E-mail<Input name="email" type="email" required autoComplete="email" placeholder="voce@exemplo.com" /></label>
    <Button size="lg" loading={pending}>Enviar link</Button>
    {state.error ? <p role="alert" className="text-body-sm text-lab-danger">{state.error}</p> : null}
  </form>;
}
