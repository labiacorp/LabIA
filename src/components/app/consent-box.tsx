"use client";

import Link from "next/link";
import { CONSENT_FIELD } from "@/lib/consent";

// The one agreement before sign-up and Google sign-in. Name is the field the server actions read.
export function ConsentBox({ onChange }: { onChange?: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-body-sm leading-6">
      <input type="checkbox" name={CONSENT_FIELD} required onChange={(event) => onChange?.(event.target.checked)} className="mt-1 size-5 shrink-0 accent-lab-text" />
      <span>I&apos;m 18 or older and I accept the <Link href="/termos" target="_blank" className="text-lab-text underline">Terms of Use</Link> and the <Link href="/privacidade" target="_blank" className="text-lab-text underline">Privacy Policy</Link>.</span>
    </label>
  );
}
