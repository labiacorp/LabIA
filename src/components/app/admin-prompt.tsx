// Admin-only: the exact text sent to the model for one generation. Render it only after `isOwner()`; the text must never reach a normal account.
export function AdminPrompt({ prompt, model, label = "Prompt used" }: { prompt: unknown; model?: string | null; label?: string }) {
  if (typeof prompt !== "string" || !prompt.trim()) return null;
  return <details className="rounded-control border border-dashed border-lab-border-strong bg-lab-surface-1 px-3 py-2 text-caption">
    <summary className="cursor-pointer text-lab-text-dim">{label} · admin only{model ? ` · ${model}` : ""}</summary>
    <p className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-[12px] leading-5 text-lab-text">{prompt}</p>
  </details>;
}
