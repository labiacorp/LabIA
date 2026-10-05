"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/password-rules";
import { resetPassword } from "./actions";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword.bind(null, token), { error: "" });
  return <form action={action} className="grid gap-3">
    <label className="grid gap-2 text-caption">Nova senha<Input name="password" type="password" required minLength={PASSWORD_MIN} maxLength={PASSWORD_MAX} autoComplete="new-password" placeholder={`Mínimo de ${PASSWORD_MIN} caracteres`} /></label>
    <Button size="lg" loading={pending}>Salvar nova senha</Button>
    {state.error ? <p role="alert" className="text-body-sm text-lab-danger">{state.error}</p> : null}
  </form>;
}
