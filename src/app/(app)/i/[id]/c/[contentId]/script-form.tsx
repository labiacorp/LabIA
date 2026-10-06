"use client";

import { useActionState, useId } from "react";
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
        <Textarea
          id={id}
          name="script"
          defaultValue={script}
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
