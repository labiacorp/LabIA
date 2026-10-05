"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CONSENT_FIELD } from "@/lib/consent";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/password-rules";
import { authenticatePassword } from "./actions";
// signup=false while e-mail is off: no way to create an account or recover a password by e-mail yet.
export function PasswordLogin({ signup }: { signup: boolean }) {
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
      {create ? (
        <label className="flex items-start gap-3 text-body-sm leading-6">
          <input type="checkbox" name={CONSENT_FIELD} required className="mt-1 size-5 shrink-0 accent-lab-reagent" />
          <span>Li e aceito os <Link href="/termos" target="_blank" className="underline">Termos de Uso</Link> e a <Link href="/privacidade" target="_blank" className="underline">Política de Privacidade</Link>.</span>
        </label>
      ) : null}
      <Button size="lg" loading={pending}>
        {create ? "Criar conta" : "Entrar"}
      </Button>
      {state.error ? (
        <p role="alert" className="text-body-sm text-lab-danger">
          {state.error}{" "}
          {state.unverified ? <Link href={`/verificar-email?email=${encodeURIComponent(state.unverified)}`} className="underline">Confirmar agora</Link> : null}
        </p>
      ) : null}
      {create || !signup ? null : <Link href="/esqueci-senha" className="text-body-sm text-lab-text-dim underline">Esqueci minha senha</Link>}
      {signup ? <button type="button" onClick={() => setCreate(!create)} className="text-left text-body-sm text-lab-text-dim underline">
        {create ? "Já tenho conta · entrar" : "Ainda não tenho conta · criar com senha"}
      </button> : null}
    </form>
  );
}
