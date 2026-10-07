"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { TEXT_MAX } from "@/lib/limits";
import { saveScript } from "./management-actions";

// Roteiro is free: written here, saved without a cost confirm, and suggested to the next stages.
export function ScriptForm({ influencerId, contentId, script }: { influencerId: string; contentId: string; script: string }) {
  const [state, action, pending] = useActionState(saveScript.bind(null, influencerId, contentId), { error: "", message: "" });
  return (
    <form action={action} className="flex flex-col gap-3">
      <Textarea aria-label="Roteiro" name="script" defaultValue={script} rows={6} maxLength={TEXT_MAX} required placeholder="O que ela fala e o que acontece em cena, em até 15 segundos." className="font-sans text-body-sm" />
      <Button type="submit" className="h-12 w-full text-body" loading={pending}>Salvar roteiro · grátis</Button>
      {state.error ? <p role="alert" className="text-body-sm text-lab-danger">{state.error}</p> : null}
    </form>
  );
}
