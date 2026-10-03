"use client";

import { useActionState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { googleAuthAction, type GoogleState } from "@/lib/auth/actions";

const initial: GoogleState = {};

// Só para o /entrar. No /criar-conta o botão faz parte do formulário (compartilha a caixa dos Termos).
export function GoogleLoginButton({ next }: { next: string }) {
  const [state, action, pending] = useActionState(googleAuthAction, initial);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="from" value="login" />
      <input type="hidden" name="next" value={next} />
      {state.error ? <Alert variant="error" title={state.error} /> : null}
      <Button type="submit" variant="secondary" size="lg" className="w-full" loading={pending}>
        {pending ? "Abrindo o Google…" : "Continuar com Google"}
      </Button>
    </form>
  );
}
