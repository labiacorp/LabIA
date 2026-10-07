"use client";
import { useActionState, useState } from "react";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrength } from "@/components/app/password-strength";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/password-rules";
import { resetPassword } from "./actions";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword.bind(null, token), { error: "" });
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const mismatch = again.length > 0 && again !== password;
  return <form action={action} className="flex flex-col gap-5">
    <label className="flex flex-col gap-2"><span className="text-body-sm font-medium">Nova senha</span>
      <PasswordInput name="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={PASSWORD_MIN} maxLength={PASSWORD_MAX} autoComplete="new-password" placeholder={`Mínimo de ${PASSWORD_MIN} caracteres`} />
      <PasswordStrength password={password} />
    </label>
    <label className="flex flex-col gap-2"><span className="text-body-sm font-medium">Repita a senha</span>
      <PasswordInput value={again} onChange={(event) => setAgain(event.target.value)} required maxLength={PASSWORD_MAX} autoComplete="new-password" aria-invalid={mismatch} />
      {mismatch ? <span className="text-[13px] text-lab-danger">As senhas não são iguais.</span> : null}
    </label>
    {state.error ? <p role="alert" className="flex items-center gap-1.5 text-[13px] text-lab-danger"><CircleAlert className="size-3.5" aria-hidden />{state.error}</p> : null}
    <Button className="h-12 w-full text-body" loading={pending} disabled={password.length < PASSWORD_MIN || again !== password}>Salvar nova senha</Button>
  </form>;
}
