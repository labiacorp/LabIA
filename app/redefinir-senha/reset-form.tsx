"use client";

import { useActionState } from "react";

import { resetPasswordAction } from "@/app/redefinir-senha/actions";
import { PasswordField } from "@/components/auth/password-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export function ResetForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, {});

  return (
    <form action={action} className="mt-6 grid gap-[18px]" aria-busy={pending}>
      <Field label="Nova senha" htmlFor="password" description="De 8 a 72 caracteres.">
        <PasswordField id="password" name="password" autoComplete="new-password" minLength={8} maxLength={72} required />
      </Field>
      <Field label="Repita a nova senha" htmlFor="confirm">
        <PasswordField id="confirm" name="confirm" autoComplete="new-password" minLength={8} maxLength={72} required />
      </Field>
      {state.error ? <Alert variant="error" title={state.error} /> : null}
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {pending ? "Salvando…" : "Salvar nova senha"}
      </Button>
    </form>
  );
}
