"use client";

import { useActionState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { unlockAction, type UnlockState } from "@/app/acesso/actions";

const initialState: UnlockState = {};

export function AccessForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(unlockAction, initialState);

  return (
    <form action={action} className="mt-6 grid gap-[18px]" aria-busy={pending}>
      <input type="hidden" name="next" value={next} />
      <Field label="Código de acesso" htmlFor="code">
        <Input id="code" name="code" type="password" autoComplete="off" required className="h-12 px-3 md:h-11" />
      </Field>
      {state.error ? <Alert variant="error" title={state.error} /> : null}
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {pending ? "Verificando…" : "Continuar"}
      </Button>
    </form>
  );
}
