"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrength } from "@/components/app/password-strength";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/password-rules";
import { authenticatePassword } from "./actions";

const label = "flex flex-col gap-2";
const name = "text-body-sm font-medium";

// Entrar (design): e-mail, password with "Esqueci a senha", one button. `recover` is false while e-mail is off.
export function PasswordLogin({ recover }: { recover: boolean }) {
  // Controlled: React 19 clears an uncontrolled form after every action, so a wrong password would wipe the e-mail too.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, action, pending] = useActionState(authenticatePassword, { error: "" });
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="mode" value="login" />
      <label className={label}><span className={name}>E-mail</span><Input name="email" type="email" required autoComplete="email" placeholder="voce@exemplo.com" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label className={label}>
        <span className="flex items-center justify-between"><span className={name}>Senha</span>{recover ? <Link href="/esqueci-senha" className="min-h-8 content-center text-body-sm underline underline-offset-[3px]">Esqueci a senha</Link> : null}</span>
        <PasswordInput name="password" value={password} onChange={(event) => setPassword(event.target.value)} required maxLength={PASSWORD_MAX} autoComplete="current-password" placeholder="Sua senha" aria-invalid={!!state.error} />
        {state.error ? <span role="alert" className="flex items-center gap-1.5 text-[13px] text-lab-danger"><CircleAlert className="size-3.5 shrink-0" aria-hidden />{state.error}{state.unverified ? <> <Link href={`/verificar-email?email=${encodeURIComponent(state.unverified)}`} className="underline">Confirmar agora</Link></> : null}</span> : null}
      </label>
      <Button className="h-14 w-full text-body" loading={pending}>{pending ? "Entrando" : "Entrar"}</Button>
    </form>
  );
}

// Criar conta (design "Convite"/"Código de acesso" success layout, now open to everyone): name, e-mail, password.
export function PasswordSignup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, action, pending] = useActionState(authenticatePassword, { error: "" });
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="mode" value="signup" />
      <label className={label}><span className={name}>Seu nome</span><Input name="name" autoComplete="name" maxLength={80} placeholder="Como quer ser chamado" /></label>
      <label className={label}><span className={name}>E-mail</span><Input name="email" type="email" required autoComplete="email" placeholder="voce@exemplo.com" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label className={label}><span className={name}>Crie uma senha</span>
        <PasswordInput name="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={PASSWORD_MIN} maxLength={PASSWORD_MAX} autoComplete="new-password" placeholder={`Mínimo de ${PASSWORD_MIN} caracteres`} />
        <PasswordStrength password={password} />
      </label>
      {state.error ? <p role="alert" className="flex items-center gap-1.5 text-[13px] text-lab-danger"><CircleAlert className="size-3.5 shrink-0" aria-hidden />{state.error}</p> : null}
      <Button className="h-14 w-full text-body" loading={pending}>Criar conta</Button>
    </form>
  );
}
