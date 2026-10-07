"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { importInfluencer, type ImportState } from "./actions";
import { NICHES } from "../nova/niches";

const field = "rounded-control border-[1.5px] border-lab-border-strong bg-lab-surface-2 px-3 text-body-sm text-lab-text placeholder:text-lab-text-dim focus-visible:border-lab-text focus-visible:outline-none";

export function ImportForm({ images }: { images: { id: string; url: string; name: string }[] }) {
  const [state, action, pending] = useActionState(importInfluencer, {} as ImportState);
  const [chosen, setChosen] = useState(images[0]?.id ?? "");
  return <form action={action} className="flex flex-col gap-5">
    <input type="hidden" name="asset" value={chosen} />
    <fieldset className="flex flex-col gap-2"><legend className="mb-1 text-body-sm font-medium">Her image</legend>
      {images.length ? <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Imported images">
        {images.map((image) => <button key={image.id} type="button" role="radio" aria-checked={chosen === image.id} title={image.name} onClick={() => setChosen(image.id)}
          className={`relative aspect-[4/5] overflow-hidden rounded-control focus-visible:outline-none focus-visible:shadow-lab-focus ${chosen === image.id ? "shadow-[inset_0_0_0_2.5px_var(--lab-text)]" : "shadow-[inset_0_0_0_1px_var(--lab-border)]"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt={image.name} className="absolute inset-0 size-full object-cover" />
        </button>)}
      </div> : <p className="text-body-sm text-lab-text-dim">Import her photo above first, then pick it here.</p>}
    </fieldset>
    <label className="flex flex-col gap-1.5"><span className="text-body-sm font-medium">Name</span><input name="name" required maxLength={60} placeholder="Ex.: Malu Andrade" className={`h-11 ${field}`} /></label>
    <fieldset className="flex flex-col gap-2"><legend className="mb-1 text-body-sm font-medium">Niche</legend><div className="flex flex-wrap gap-2">
      {NICHES.map((niche, index) => <label key={niche} className="flex h-10 cursor-pointer items-center rounded-full bg-lab-surface-2 px-4 text-body-sm font-medium has-[:checked]:bg-lab-text has-[:checked]:text-lab-bg has-[:focus-visible]:shadow-lab-focus">
        <input type="radio" name="niche" value={niche} defaultChecked={index === 0} className="sr-only" />{niche}</label>)}
    </div></fieldset>
    <label className="flex flex-col gap-1.5"><span className="text-body-sm font-medium">What she looks like (optional)</span>
      <textarea name="description" maxLength={400} rows={3} placeholder="Curly brown hair, freckles, earthy tones." className={`min-h-20 py-3 ${field}`} />
      <span className="text-[13px] text-lab-text-dim">Used in the prompts of her contents. You can edit it later.</span>
    </label>
    <div className="flex flex-wrap items-center gap-3">
      <Button type="submit" size="lg" loading={pending} disabled={!chosen}>Import influencer · free</Button>
    </div>
    {state.error ? <p role="alert" className="text-[13px] text-lab-danger">{state.error}</p> : null}
  </form>;
}
