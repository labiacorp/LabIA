"use client";
import { useSyncExternalStore, useState } from "react";
import { Button } from "@/components/ui/button";
const subscribe = () => () => {};
const getOrigin = () => window.location.origin;
const serverOrigin = () => "";
export function ReferralLink({ code }: { code: string }) {
  const origin = useSyncExternalStore(subscribe, getOrigin, serverOrigin);
  const url = origin ? `${origin}/r/${code}` : "";
  const [message, setMessage] = useState("");
  return (
    <div className="mt-4 grid gap-3">
      <label htmlFor="referral-link" className="text-body-sm">
        Seu link de indicação
      </label>
      <input
        id="referral-link"
        readOnly
        value={url}
        onFocus={(e) => e.target.select()}
        className="w-full rounded-lg border border-lab-border bg-lab-bg p-3 text-body-sm"
      />
      <Button
        variant="secondary"
        disabled={!url}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setMessage("Link copiado.");
          } catch {
            setMessage("Selecione e copie o link acima.");
          }
        }}
      >
        Copiar link
      </Button>
      <p role="status" className="text-body-sm text-lab-text-muted">
        {message}
      </p>
    </div>
  );
}
