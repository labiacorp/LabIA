"use client";

import { useActionState, useId, useState } from "react";
import { CONTENT_STARTERS } from "@/lib/content-templates";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { saveScript } from "./management-actions";
export function ScriptForm({
  influencerId,
  contentId,
  script,
}: {
  influencerId: string;
  contentId: string;
  script: string;
}) {
  const id = useId();
  const [text, setText] = useState(script);
  const [state, action, pending] = useActionState(
    saveScript.bind(null, influencerId, contentId),
    { error: "", message: "" },
  );
  return (
    <form action={action} className="mt-4 grid gap-3">
      <Field
        label="Roteiro e direção da cena"
        htmlFor={id}
        description="Escreva o roteiro sem custo. Ele será sugerido nas próximas gerações; arquivos existentes não são alterados."
      >
        <div className="flex flex-wrap gap-2" aria-label="Estruturas prontas">
        {CONTENT_STARTERS.map((starter) => (
          <button
            key={starter.id}
            type="button"
            className="h-8 rounded-full border border-lab-border-strong px-3 text-caption text-lab-text-dim transition-colors hover:border-lab-text hover:text-lab-text"
            onClick={() => (!text.trim() || window.confirm("Trocar o roteiro atual por esta estrutura?")) && setText(starter.script)}
          >
            {starter.name}
          </button>
        ))}
      </div>
      <Textarea
          id={id}
          name="script"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={5}
          maxLength={2000}
          required
          className="font-sans text-body-sm"
        />
      </Field>
      <Button
        type="submit"
        size="lg"
        variant="secondary"
        loading={pending}
        className="justify-self-start"
      >
        Salvar roteiro
      </Button>
      {state.error || state.message ? (
        <p
          role={state.error ? "alert" : "status"}
          className={`text-body-sm ${state.error ? "text-lab-danger" : "text-lab-success"}`}
        >
          {state.error || state.message}
        </p>
      ) : null}
    </form>
  );
}
