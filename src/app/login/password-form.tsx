"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { CONSENT_FIELD } from "@/lib/consent";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/password-rules";
import { authenticatePassword } from "./actions";
// signup=false while e-mail is off: no way to create an account or recover a password by e-mail yet.
export function PasswordLogin({ signup }: { signup: boolean }) {
  const [create, setCreate] = useState(false);
  // Controlled: React 19 clears an uncontrolled form after every action, so a wrong password would wipe the e-mail too.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, action, pending] = useActionState(authenticatePassword, { error: "" });
  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="mode" value={create ? "signup" : "login"} />
      <label className="grid gap-2 text-body-sm font-medium">
        E-mail
        <Input name="email" type="email" required autoComplete="email" placeholder="voce@exemplo.com" value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label className="grid gap-2 text-body-sm font-medium">
        Senha
        <PasswordInput
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
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
      <Button size="lg" className="w-full" loading={pending}>
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
