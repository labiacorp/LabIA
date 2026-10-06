"use client";
import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateBrief } from "./management-actions";
export function BriefForm({
  influencerId,
  contentId,
  title,
  idea,
  running,
}: {
  influencerId: string;
  contentId: string;
  title: string;
  idea: string;
  running: boolean;
}) {
  const [state, action, pending] = useActionState(
    updateBrief.bind(null, influencerId, contentId),
    { error: "", message: "" },
  );
  return (
    <details className="group my-3 [&[open]]:rounded-card [&[open]]:bg-lab-surface-1 [&[open]]:p-5 [&[open]]:shadow-[inset_0_0_0_1px_var(--lab-border)]">
      <summary className="inline-flex min-h-11 cursor-pointer items-center text-body-sm text-lab-text-dim underline underline-offset-4 hover:text-lab-text">
        Editar título e ideia
      </summary>
      <form action={action} className="mt-5 grid gap-4">
        <label className="grid gap-2 text-body-sm">
          Título do conteúdo
          <Input
            name="title"
            defaultValue={title}
            required
            maxLength={120}
            disabled={running}
          />
        </label>
        <label className="grid gap-2 text-body-sm">
          Ideia / briefing
          <textarea
            name="idea"
            defaultValue={idea}
            maxLength={2000}
            rows={4}
            disabled={running}
            className="w-full rounded-lab border border-lab-border bg-lab-surface-2 p-3"
          />
        </label>
        <p className="text-body-sm text-lab-text-muted">
          {running
            ? "Aguarde a geração terminar para editar."
            : "Editar a ideia não regenera imagens ou vídeos já criados."}
        </p>
        <div>
          <Button type="submit" size="lg" disabled={running} loading={pending}>
            Salvar briefing
          </Button>
        </div>
        {state.error && (
          <p role="alert" className="text-body-sm text-lab-danger">
            {state.error}
          </p>
        )}
        {state.message && (
          <p role="status" className="text-body-sm text-lab-success">
            {state.message}
          </p>
        )}
      </form>
    </details>
  );
}
