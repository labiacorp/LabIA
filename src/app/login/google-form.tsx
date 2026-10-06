"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CONSENT_FIELD } from "@/lib/consent";

// The terms checkbox sits before the Google button: the account does not exist yet, so accepting comes first.
export function GoogleSignIn({ action, enabled }: { action: (form: FormData) => void; enabled: boolean }) {
  const [accepted, setAccepted] = useState(false);
  return (
    <form action={action} className="grid gap-3">
      <label className="flex items-start gap-3 text-body-sm leading-6">
        <input type="checkbox" name={CONSENT_FIELD} checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 size-5 shrink-0 accent-lab-reagent" />
        <span>Li e aceito os <Link href="/termos" target="_blank" className="underline">Termos de Uso</Link> e a <Link href="/privacidade" target="_blank" className="underline">Política de Privacidade</Link>.</span>
      </label>
      <Button size="lg" variant="secondary" disabled={!enabled || !accepted} className="w-full">
        <span aria-hidden className="flex size-5 items-center justify-center rounded-full bg-lab-text text-xs font-bold text-lab-on-reagent">G</span>
        Continuar com Google
      </Button>
    </form>
  );
}
