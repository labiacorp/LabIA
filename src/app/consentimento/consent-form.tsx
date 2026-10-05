"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { CONSENT_FIELD } from "@/lib/consent";
import { acceptTerms } from "./actions";

export function ConsentForm() {
  const [state, action, pending] = useActionState(acceptTerms, { error: "" });
  return <form action={action} className="grid gap-3">
    <label className="flex items-start gap-3 text-body-sm leading-6"><input type="checkbox" name={CONSENT_FIELD} required className="mt-1 size-5 shrink-0 accent-lab-reagent" />Li e aceito os Termos de Uso e a Política de Privacidade.</label>
    <Button size="lg" loading={pending}>Continuar</Button>
    {state.error ? <p role="alert" className="text-body-sm text-lab-danger">{state.error}</p> : null}
  </form>;
}
