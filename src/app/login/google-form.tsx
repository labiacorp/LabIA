"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConsentBox } from "@/components/app/consent-box";

// Google sign-in, kept next to e-mail and password (owner powers need a Google session). The button waits for
// the one checkbox: the tick is read by the server action before the redirect to Google.
export function GoogleSignIn({ action }: { action: (form: FormData) => void }) {
  const [accepted, setAccepted] = useState(false);
  return (
    <form action={action} className="flex flex-col gap-4">
      <ConsentBox onChange={setAccepted} />
      <Button variant="secondary" disabled={!accepted} className="h-12 w-full text-body">
        <span aria-hidden className="flex size-5 items-center justify-center rounded-full bg-lab-text text-xs font-bold text-lab-bg">G</span>
        Continuar com Google
      </Button>
    </form>
  );
}
