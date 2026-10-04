"use client";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateAccount } from "./actions";
export function AccountForm({
  name,
  bio,
  defaultAspectRatio,
  defaultContentView,
}: {
  name: string | null;
  bio: string;
  defaultAspectRatio: string;
  defaultContentView: string;
}) {
  const [state, action, pending] = useActionState(updateAccount, {
    message: "",
    ok: false,
  });
  const [description, setDescription] = useState(bio);
  const field =
    "min-h-11 rounded-control border border-lab-border bg-lab-surface-2 p-3 text-body-sm";
  return (
    <form action={action} className="grid gap-5">
      <label className="grid gap-2 text-body-sm">
        Como podemos chamar você?
        <Input
          name="name"
          defaultValue={name ?? ""}
          required
          maxLength={80}
          autoComplete="name"
        />
      </label>
      <label className="grid gap-2 text-body-sm">
        Sobre você
        <textarea
          name="bio"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={240}
          rows={3}
          placeholder="Conte um pouco sobre o que você cria."
          className={field}
        />
        <span className="text-caption text-lab-text-muted">
          {description.length}/240 · Visível apenas na sua conta
        </span>
      </label>
      <div className="border-t border-lab-border pt-5">
        <h3 className="font-medium">Seu jeito de criar</h3>
        <p className="mt-2 text-body-sm text-lab-text-dim">
          Preferências usadas ao criar rascunhos e abrir uma produção.
        </p>
      </div>
      <label className="grid gap-2 text-body-sm">
        Formato padrão
        <select
          name="defaultAspectRatio"
          defaultValue={defaultAspectRatio}
          className={field}
        >
          <option value="9:16">Vertical · 9:16</option>
          <option value="16:9">Horizontal · 16:9</option>
          <option value="1:1">Quadrado · 1:1</option>
        </select>
      </label>
      <label className="grid gap-2 text-body-sm">
        Abrir produções em
        <select
          name="defaultContentView"
          defaultValue={defaultContentView}
          className={field}
        >
          <option value="steps">Etapas</option>
          <option value="canvas">Canvas</option>
        </select>
      </label>
      <div>
        <Button type="submit" size="lg" loading={pending}>
          Salvar perfil
        </Button>
      </div>
      {state.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={`text-body-sm ${state.ok ? "text-lab-success" : "text-lab-danger"}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
