"use client";

import { useActionState } from "react";

import { ResendForm } from "@/app/criar-conta/sign-up-form";
import { AuthLink } from "@/components/auth/auth-parts";
import { PasswordField } from "@/components/auth/password-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { signInAction, type SignInState } from "@/lib/auth/actions";

const initialState: SignInState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signInAction, initialState);

  return (
    <>
    <form action={action} className="mt-6 grid gap-[18px]" aria-busy={pending}>
      <input type="hidden" name="next" value={next} />
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" defaultValue={state.email} required className="h-12 px-3 md:h-11" />
      </Field>
      <Field label="Senha" htmlFor="password">
        <PasswordField id="password" name="password" autoComplete="current-password" required />
      </Field>
      {state.error ? <Alert variant="error" title={state.error} /> : null}
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
      <p className="text-center">
        <AuthLink href="/esqueci-a-senha">Esqueci a senha</AuthLink>
      </p>
    </form>
    {state.unconfirmedEmail ? (
      <div className="mt-6 grid gap-3 border-t border-lab-border pt-5">
        <ResendForm email={state.unconfirmedEmail} />
        <AuthLink href="/criar-conta/codigo">Já tenho o código de 6 números</AuthLink>
      </div>
    ) : null}
    </>
  );
}
