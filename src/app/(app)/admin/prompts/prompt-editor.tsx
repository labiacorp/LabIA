"use client";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { resetPrompt, savePrompt, type AdminState } from "../actions";

const initial: AdminState = { ok: false, message: "" };

export function PromptEditor({ promptKey, label, where, vars, defaultText, text, custom, max }: {
  promptKey: string; label: string; where: string; vars: string[]; defaultText: string; text: string; custom: boolean; max: number;
}) {
  const [saved, save, saving] = useActionState(savePrompt, initial);
  const [reset, restore, restoring] = useActionState(resetPrompt, initial);
  const [value, setValue] = useState(text);
  const [last, setLast] = useState<"save" | "reset">("save");
  const state = last === "reset" ? reset : saved;
  return <details open={custom} className="group">
    <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-body-sm font-medium">
      {label}
      <span className={`rounded-full px-2 py-0.5 text-[11px] ${custom ? "bg-lab-reagent text-lab-on-reagent" : "bg-lab-surface-2 text-lab-text-dim"}`}>{custom ? "custom" : "default"}</span>
      <span className="font-mono text-[11px] text-lab-text-dim">{promptKey}</span>
    </summary>
    <p className="mt-2 text-caption text-lab-text-dim">{where}</p>
    {vars.length ? <p className="mt-1 text-caption text-lab-text-dim">Placeholders: {vars.map((name) => <code key={name} className="mr-1 rounded bg-lab-surface-2 px-1">{`{${name}}`}</code>)}</p> : null}
    <form action={(data) => { setLast("save"); save(data); }} className="mt-3 grid gap-2">
      <input type="hidden" name="key" value={promptKey} />
      <textarea name="text" value={value} onChange={(event) => setValue(event.target.value)} rows={8} maxLength={max} required spellCheck={false}
        className="min-h-32 w-full rounded-control border border-lab-border bg-lab-surface-2 p-3 font-mono text-[13px] leading-5" />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" loading={saving} disabled={value.trim() === text.trim() && custom}>Save</Button>
        <span className="text-caption text-lab-text-dim">{value.length.toLocaleString("en-US")} / {max.toLocaleString("en-US")}</span>
        {state.message ? <span role={state.ok ? "status" : "alert"} className={`text-caption ${state.ok ? "text-lab-success" : "text-lab-danger"}`}>{state.message}</span> : null}
      </div>
    </form>
    {custom ? <form action={(data) => { setLast("reset"); setValue(defaultText); restore(data); }} className="mt-1"><input type="hidden" name="key" value={promptKey} /><Button type="submit" variant="secondary" loading={restoring}>Reset to default</Button></form> : null}
  </details>;
}
