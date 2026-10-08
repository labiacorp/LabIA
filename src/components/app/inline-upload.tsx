"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";

export type UploadedAsset = { id: string; url: string; kind: "IMAGE" | "VIDEO"; name: string; durationSec: number | null; width?: number | null; height?: number | null };

// "Upload yours" next to any field that asks for an image or a video: sends the file to the same private storage as the
// library (/api/assets/upload) and hands the new asset back so the field can select it at once.
export function InlineUpload({ accept, label = "Upload from your computer", disabled, onUploaded }: {
  accept: "image" | "video"; label?: string; disabled?: boolean; onUploaded: (asset: UploadedAsset) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function send(file: File) {
    setError("");
    if (file.size > 4 * 1024 * 1024) return setError("Use a file up to 4 MB.");
    setBusy(true);
    try {
      const response = await fetch("/api/assets/upload", { method: "POST", headers: { "Content-Type": file.type, "X-File-Name": encodeURIComponent(file.name) }, body: file });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Could not upload. Try again.");
      onUploaded({ id: data.id, url: data.url, kind: data.kind, name: data.name ?? file.name, durationSec: data.durationSec ?? null, width: data.width ?? null, height: data.height ?? null });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  return <span className="flex flex-wrap items-center gap-2">
    <button type="button" disabled={busy || disabled} onClick={() => input.current?.click()}
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-lab-border-strong px-3 text-caption text-lab-text-dim hover:bg-lab-surface-2 hover:text-lab-text disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-lab-focus">
      {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Upload className="size-3.5" aria-hidden />}{label}
    </button>
    <input ref={input} type="file" className="sr-only" tabIndex={-1} accept={accept === "image" ? "image/jpeg,image/png,image/webp" : "video/mp4"} onChange={(event) => { const file = event.target.files?.[0]; if (file) void send(file); }} />
    {error ? <span role="alert" className="text-caption text-lab-danger">{error}</span> : null}
  </span>;
}
