"use client";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginDevelopment } from "./actions";
export function DevelopmentLogin() {
  const [state, action, pending] = useActionState(loginDevelopment, {
    error: "",
  });
  const [email, setEmail] = useState("");
  return (
    <form
      action={action}
      className="grid gap-3 border-t border-lab-border pt-5"
    >
      <p className="font-mono text-eyebrow uppercase text-lab-text-muted">
        Só em desenvolvimento
      </p>
      <label className="grid gap-2 text-caption">
        E-mail liberado
        <Input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <Button variant="secondary" size="lg" loading={pending}>
        Entrar sem Google
      </Button>
      {state.error ? (
        <p role="alert" className="text-body-sm text-lab-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
