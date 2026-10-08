// Admin-only: the exact text sent to the model for one generation. Render it only after `isOwner()`; the text must never reach a normal account.
// `details` lists the other fields sent with the prompt (label, value); never put a signed media link in it.
export function AdminPrompt({ prompt, model, label = "Prompt used", details }: { prompt: unknown; model?: string | null; label?: string; details?: [string, string][] }) {
  if (typeof prompt !== "string" || !prompt.trim()) return null;
  return <details className="rounded-control border border-dashed border-lab-border-strong bg-lab-surface-1 px-3 py-2 text-caption">
    <summary className="cursor-pointer text-lab-text-dim">{label} · admin only{model ? ` · ${model}` : ""}</summary>
    {details?.length ? <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 font-mono text-[12px] leading-5">
      {details.map(([name, value]) => <div key={name} className="contents"><dt className="text-lab-text-muted">{name}</dt><dd className="break-words text-lab-text">{value}</dd></div>)}
    </dl> : null}
    <p className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-[12px] leading-5 text-lab-text">{prompt}</p>
  </details>;
}
