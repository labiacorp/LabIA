"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createProduction } from "../management";
export function CreationForm({
  characters,
  selected,
  initial,
  defaultAspectRatio = "9:16",
}: {
  characters: { id: string; name: string }[];
  selected?: string;
  initial?: {
    title: string;
    idea: string;
    script: string;
    aspectRatio: string;
  };
  defaultAspectRatio?: string;
}) {
  const [error, action, pending] = useActionState(createProduction, "");
  const selectClass =
    "min-h-11 w-full rounded-control border border-lab-border bg-lab-surface-2 p-3 text-body-sm";
  return (
    <form
      action={action}
      className="grid gap-5 rounded-lab border border-lab-border bg-lab-surface-1 p-6"
    >
      <label className="grid gap-2 text-body-sm">
        Personagem
        <select
          name="influencerId"
          required
          defaultValue={selected ?? (characters.length === 1 ? characters[0].id : "")}
          className={selectClass}
        >
          <option value="" disabled>
            Escolha seu personagem
          </option>
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-body-sm">
        Título
        <Input
          name="title"
          defaultValue={initial?.title ?? ""}
          required
          maxLength={120}
          placeholder="Ex.: três dicas para começar"
        />
      </label>
      <label className="grid gap-2 text-body-sm">
        Ideia (opcional)
        <textarea
          name="idea"
          defaultValue={initial?.idea ?? ""}
          rows={4}
          maxLength={2000}
          className={selectClass}
        />
      </label>
      <label className="grid gap-2 text-body-sm">
        Formato
        <select
          name="aspectRatio"
          defaultValue={initial?.aspectRatio ?? defaultAspectRatio}
          className={selectClass}
        >
          <option value="9:16">Vertical · 9:16</option>
          <option value="16:9">Horizontal · 16:9</option>
          <option value="1:1">Quadrado · 1:1</option>
        </select>
      </label>
      <details open={Boolean(initial?.script)} className="border-t border-lab-border pt-4"><summary className="cursor-pointer py-2 text-body-sm font-medium">Já tem um roteiro? (opcional)</summary>
      <label className="mt-3 grid gap-2 text-body-sm">
        Roteiro inicial
        <textarea
          name="script"
          defaultValue={initial?.script ?? ""}
          rows={6}
          maxLength={2000}
          className={selectClass}
        />
        <span className="text-caption text-lab-text-muted">
          Revise os campos entre colchetes antes de gerar. O roteiro pode ser
          editado depois.
        </span>
      </label>
      </details>
      <p className="text-body-sm text-lab-text-dim">
        Criar o rascunho é gratuito. Cada geração será confirmada separadamente,
        com a estimativa em reais.
      </p>
      <Button type="submit" size="lg" loading={pending}>
        Criar rascunho
      </Button>
      {error && (
        <p role="alert" className="text-body-sm text-lab-danger">
          {error}
        </p>
      )}
    </form>
  );
}
