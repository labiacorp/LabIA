"use client";

import { useActionState, useState } from "react";
import { Check, Copy } from "lucide-react";

import { createInviteAction } from "@/app/admin/convites/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const fieldClass =
  "flex h-9 w-full rounded-control border border-lab-border bg-lab-surface-2 px-3 text-sm text-lab-text focus-visible:border-lab-reagent focus-visible:outline-none";

export function CreateInviteForm({ workspaces }: { workspaces: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createInviteAction, {});
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-4">
      <form action={action} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-lab-text">
            E-mail <span className="text-lab-text-muted">(opcional)</span>
          </label>
          <Input id="email" name="email" type="email" placeholder="Qualquer e-mail" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="workspaceId" className="text-sm font-medium text-lab-text">
            Destino
          </label>
          <select id="workspaceId" name="workspaceId" className={fieldClass} defaultValue="">
            <option value="">Workspace novo (sem gasto)</option>
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                Membro de {workspace.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Gerando…" : "Gerar convite"}
        </Button>
      </form>

      {state.error ? (
        <p role="alert" className="text-sm text-lab-danger">
          {state.error}
        </p>
      ) : null}

      {state.link ? (
        <div className="rounded-control border border-lab-border bg-lab-surface-2 p-3">
          <p className="text-xs text-lab-text-dim">Copie agora: o link aparece só esta vez. Vale 7 dias e um uso.</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate font-mono text-xs text-lab-text">{state.link}</code>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(state.link!).then(() => setCopied(true));
              }}
            >
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
