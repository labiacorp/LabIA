"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CostChip } from "@/components/ui/cost-chip";
import { Field, Textarea } from "@/components/ui/field";
import type { ContentState } from "./actions";

export function SceneForm({ action, intent, expectedBrl, prompt, blockedReason }: {
  action: (previous: ContentState, data: FormData) => Promise<ContentState>;
  intent: string;
  expectedBrl: number;
  prompt: string;
  blockedReason?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="mt-4 grid gap-3" aria-busy={pending}>
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="expectedBrl" value={expectedBrl} />
      <Field label="Cena" htmlFor="scene-prompt" description="O retrato de frente será usado como referência para manter o rosto.">
        <Textarea id="scene-prompt" name="prompt" defaultValue={prompt} required maxLength={2000} disabled={pending} />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button loading={pending} disabled={!!blockedReason}>Aprovar custo e gerar imagem</Button>
        <CostChip state="estimated" value={expectedBrl} prefix="custo" />
      </div>
      {blockedReason ? <p className="text-caption text-lab-warning">{blockedReason}</p> : null}
      {state.error ? <Alert variant="error" title={state.error} /> : null}
    </form>
  );
}
