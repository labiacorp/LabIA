"use client";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/password-rules";
import { authenticatePassword } from "./actions";
export function PasswordLogin() {
  const [create, setCreate] = useState(false);
  const [state, action, pending] = useActionState(authenticatePassword, { error: "" });
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="mode" value={create ? "signup" : "login"} />
      <label className="grid gap-2 text-caption">
        E-mail
        <Input name="email" type="email" required autoComplete="email" placeholder="voce@exemplo.com" />
      </label>
      <label className="grid gap-2 text-caption">
        Senha
        <Input
          name="password"
          type="password"
          required
          minLength={create ? PASSWORD_MIN : undefined}
          maxLength={PASSWORD_MAX}
          autoComplete={create ? "new-password" : "current-password"}
          placeholder={create ? `Mínimo de ${PASSWORD_MIN} caracteres` : "Sua senha"}
        />
      </label>
      <Button size="lg" loading={pending}>
        {create ? "Criar conta" : "Entrar"}
      </Button>
      {state.error ? (
        <p role="alert" className="text-body-sm text-lab-danger">
          {state.error}
        </p>
      ) : null}
      <button type="button" onClick={() => setCreate(!create)} className="text-left text-body-sm text-lab-text-dim underline">
        {create ? "Já tenho conta · entrar" : "Ainda não tenho conta · criar com senha"}
      </button>
    </form>
  );
}
