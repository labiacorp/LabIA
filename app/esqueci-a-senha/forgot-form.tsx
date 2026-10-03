"use client";

import { useActionState } from "react";

import { forgotPasswordAction } from "@/app/esqueci-a-senha/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, {});

  return (
    <form action={action} className="mt-6 grid gap-[18px]" aria-busy={pending}>
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" maxLength={254} required className="h-12 px-3 md:h-11" />
      </Field>
      {state.error ? <Alert variant="error" title={state.error} /> : null}
      {state.sent ? (
        <Alert variant="success" title="Pedido recebido">
          Se existe uma conta com esse e-mail, enviamos um link para criar a nova senha. Vale por 30 minutos.
        </Alert>
      ) : null}
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {pending ? "Enviando…" : "Enviar link"}
      </Button>
    </form>
  );
}
