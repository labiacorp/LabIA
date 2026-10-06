"use client";

import { useActionState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CostChip } from "@/components/ui/cost-chip";
import type { KitState } from "../kit-actions";

type Props = {
  action: (previous: KitState, data: FormData) => Promise<KitState>;
  intent: string;
  expectedBrl: number;
  label: string;
  variant?: "primary" | "secondary";
  blockedReason?: string;
};

// The price shown here is sent back and compared on the server: if the catalog changed in between, nothing is charged.
export function KitForm({ action, intent, expectedBrl, label, variant = "primary", blockedReason }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="grid gap-3" aria-busy={pending}>
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="expectedBrl" value={expectedBrl} />
      <div className="flex flex-wrap items-center gap-3">
        <Button variant={variant} loading={pending} disabled={!!blockedReason}>{label}</Button>
        <CostChip state="estimated" value={expectedBrl} prefix="custo" />
      </div>
      {blockedReason ? <p className="text-caption text-lab-warning">{blockedReason}</p> : null}
      {state.error ? <Alert variant="error" title={state.error} /> : null}
    </form>
  );
}
