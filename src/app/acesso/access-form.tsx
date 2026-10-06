"use client";

import { useActionState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { unlockAction, type UnlockState } from "./actions";

const initialState: UnlockState = {};

export function AccessForm() {
  const [state, action, pending] = useActionState(unlockAction, initialState);

  return (
    <form action={action} className="grid gap-4" aria-busy={pending}>
      <Field label="Código de acesso" htmlFor="code">
        <Input id="code" name="code" type="password" autoComplete="off" required className="h-[60px] font-mono text-[22px] tracking-[.24em]" />
      </Field>
      {state.error ? <Alert variant="error" title={state.error} /> : null}
      <Button size="lg" className="w-full" loading={pending}>{pending ? "Verificando…" : "Validar código"}</Button>
    </form>
  );
}
