"use client";
import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AccountAvatar } from "@/components/app/account-avatar";
import { updateAvatar } from "./avatar-actions";
export function AvatarForm({
  name,
  version,
}: {
  name: string;
  version?: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState("");
  const [state, action, pending] = useActionState(
    async (previous: { error: string; message: string }, form: FormData) => {
      const file = form.get("avatar");
      if (
        form.get("intent") !== "remove" &&
        file instanceof File &&
        file.size > 5 * 1024 * 1024
      )
        return { error: "Escolha uma foto de até 5 MB.", message: "" };
      const result = await updateAvatar(previous, form);
      if (!result.error) setFilename("");
      return result;
    },
    { error: "", message: "" },
  );
  return (
    <form
      action={action}
      className="mb-6 grid gap-4 border-b border-lab-border pb-6"
    >
      <div className="flex items-center gap-4">
        <AccountAvatar name={name} version={version} large />
        <div>
          <h3 className="font-medium">Foto de perfil</h3>
          <p className="mt-1 text-body-sm text-lab-text-dim">
            JPG, PNG ou WebP · até 5 MB
          </p>
        </div>
      </div>
      <div className="grid gap-2">
        <input
          ref={input}
          type="file"
          name="avatar"
          tabIndex={-1}
          aria-label="Escolher foto"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
          className="sr-only"
          onChange={(event) => setFilename(event.target.files?.[0]?.name ?? "")}
        />
        <Button
          type="button"
          variant="secondary"
          size="lg"
          disabled={pending}
          onClick={() => input.current?.click()}
        >
          Selecionar arquivo
        </Button>
        <p className="text-caption text-lab-text-muted">
          {filename || "Nenhum arquivo selecionado"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          name="intent"
          value="upload"
          type="submit"
          variant="secondary"
          size="lg"
          loading={pending}
        >
          Salvar foto
        </Button>
        {version && (
          <Button
            name="intent"
            value="remove"
            type="submit"
            variant="ghost"
            size="lg"
            disabled={pending}
          >
            Remover foto
          </Button>
        )}
      </div>
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
