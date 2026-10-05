"use client";
import { useState, useRef, useId } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
export function UploadReference({
  ready = true,
  local = false,
}: {
  ready?: boolean;
  local?: boolean;
}) {
  const router = useRouter();
  const inputId = useId();
  const [fileName, setFileName] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  return (
    <form
      className="mb-6 grid gap-3 rounded-lab border border-lab-border bg-lab-surface-1 p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const file = input.current?.files?.[0];
        if (!file) return;
        setError("");
        setMessage("");
        if (file.size > 4 * 1024 * 1024) {
          setError("Use um arquivo de até 4 MB.");
          return;
        }
        setBusy(true);
        try {
          const response = await fetch("/api/assets/upload", {
            method: "POST",
            headers: {
              "Content-Type": file.type,
              "X-File-Name": encodeURIComponent(file.name),
            },
            body: file,
          });
          const data = await response.json().catch(() => null);
          if (!response.ok)
            throw Error(
              data?.error || "Não foi possível importar. Tente novamente.",
            );
          setMessage("Referência salva na sua biblioteca.");
          if (input.current) input.current.value = "";
          setFileName("");
          router.refresh();
        } catch (error) {
          setError(
            error instanceof Error ? error.message : "Falha na importação.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="font-display text-xl">Suas referências</h2>
      <p className="text-body-sm text-lab-text-dim">
        Importe retratos, fichas de personagem ou um vídeo de movimento. JPG,
        PNG, WebP ou MP4 H.264 de 4–30s; até 4 MB por arquivo.
      </p>
      <label htmlFor={inputId} className="grid gap-2 text-body-sm">
        Arquivo de referência
        <span className="w-fit rounded-control border border-lab-border bg-lab-surface-2 px-4 py-3">
          Selecionar arquivo
        </span>
        <span className="break-all text-caption text-lab-text-muted">
          {fileName || "Nenhum arquivo selecionado"}
        </span>
        <input
          id={inputId}
          ref={input}
          onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
          type="file"
          required
          accept="image/jpeg,image/png,image/webp,video/mp4"
          disabled={busy || !ready}
          className="sr-only"
        />
      </label>
      <Button loading={busy} disabled={!ready} className="justify-self-start">
        Importar referência
      </Button>
      {local && (
        <p className="text-caption text-lab-text-muted">
          Ambiente de teste: arquivos salvos neste servidor local.
        </p>
      )}
      {!ready && (
        <p className="text-caption text-lab-warning">
          O armazenamento ainda precisa ser conectado para receber arquivos.
        </p>
      )}
      {error && (
        <p role="alert" className="text-body-sm text-lab-danger">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-body-sm text-lab-success">
          {message}
        </p>
      )}
    </form>
  );
}
