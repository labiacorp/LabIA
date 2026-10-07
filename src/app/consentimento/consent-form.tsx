"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { CONSENT_FIELDS } from "@/lib/consent";
import { acceptTerms } from "./actions";

const LABELS: Record<(typeof CONSENT_FIELDS)[number], string> = {
  acceptTerms: "Li e aceito os Termos de uso e a Política de privacidade.",
  syntheticMedia: "Entendo que as influencers são mídia sintética e vou sinalizar o conteúdo como feito com IA nas redes.",
  noRealPeople: "Não vou usar o rosto ou a voz de uma pessoa real sem autorização dela.",
};

// "Antes de começar" (design): three required agreements, recorded once on the account.
export function ConsentForm() {
  const [state, action, pending] = useActionState(acceptTerms, { error: "" });
  return <form action={action} className="flex flex-col gap-5">
    <div className="flex flex-col border-t border-lab-border">
      {CONSENT_FIELDS.map((field) => <label key={field} className="flex cursor-pointer items-start gap-3.5 border-b border-lab-border py-3.5">
        <input type="checkbox" name={field} required className="mt-0.5 size-6 shrink-0 rounded-md accent-lab-text" />
        <span className="flex flex-col gap-1"><span className="text-[15px] leading-[1.45]">{LABELS[field]}</span></span>
      </label>)}
    </div>
    <p className="text-[13px] text-lab-text-dim">Leia os <Link href="/termos" target="_blank" className="text-lab-text underline">Termos de uso</Link> e a <Link href="/privacidade" target="_blank" className="text-lab-text underline">Política de privacidade</Link>.</p>
    <Button className="h-14 w-full text-body" loading={pending}>Concordar e continuar</Button>
    {state.error ? <p role="alert" className="text-body-sm text-lab-danger">{state.error}</p> : null}
  </form>;
}
