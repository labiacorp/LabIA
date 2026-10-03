"use client";

import { useActionState } from "react";

import { resendConfirmationAction, signUpAction, verifyCodeAction } from "@/app/criar-conta/actions";
import { OrDivider } from "@/components/auth/auth-parts";
import { PasswordField } from "@/components/auth/password-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { googleAuthAction } from "@/lib/auth/actions";

export function SignUpForm({ invite, lockedEmail, googleEnabled }: { invite: string | null; lockedEmail: string | null; googleEnabled: boolean }) {
  const [state, action, pending] = useActionState(signUpAction, {});
  const [googleState, googleAction, googlePending] = useActionState(googleAuthAction, {});
  const error = state.error ?? googleState.error;

  return (
    <form action={action} className="mt-6 grid gap-[18px]" aria-busy={pending}>
      <input type="hidden" name="from" value="signup" />
      {invite ? <input type="hidden" name="invite" value={invite} /> : null}
      {/* Isca para robôs: invisível e fora do Tab. Pessoa de verdade nunca preenche. */}
      <div aria-hidden className="sr-only">
        <label htmlFor="website">Não preencha</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <Field label="Nome" htmlFor="name">
        <Input id="name" name="name" autoComplete="name" maxLength={80} defaultValue={state.name} required className="h-12 px-3 md:h-11" />
      </Field>
      <Field label="E-mail" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          defaultValue={lockedEmail ?? state.email}
          readOnly={Boolean(lockedEmail)}
          required
          className="h-12 px-3 md:h-11"
        />
      </Field>
      <Field label="Senha" htmlFor="password" description="De 8 a 72 caracteres.">
        <PasswordField id="password" name="password" autoComplete="new-password" minLength={8} maxLength={72} required />
      </Field>
      <label className="flex items-start gap-2 text-body-sm leading-5 text-lab-text-dim">
        <input type="checkbox" name="consent" required className="mt-0.5 size-4 shrink-0 accent-lab-reagent" />
        Li e aceito os Termos de Uso e a Política de Privacidade da LabIA.
      </label>
      {error ? <Alert variant="error" title={error} /> : null}
      <Button type="submit" size="lg" className="w-full" loading={pending} disabled={googlePending}>
        {pending ? "Criando conta…" : "Criar conta"}
      </Button>
      {googleEnabled ? (
        <>
          <OrDivider />
          {/* formNoValidate: o Google só precisa do aceite; nome e senha são do formulário. O servidor confere o aceite. */}
          <Button type="submit" variant="secondary" size="lg" className="w-full" formAction={googleAction} formNoValidate loading={googlePending} disabled={pending}>
            {googlePending ? "Abrindo o Google…" : "Continuar com Google"}
          </Button>
        </>
      ) : null}
    </form>
  );
}

export function CodeForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(verifyCodeAction, {});

  return (
    <form action={action} className="mt-6 grid gap-[18px]" aria-busy={pending}>
      <input type="hidden" name="email" value={email} />
      <Field label="Código" htmlFor="code">
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          className="h-12 px-3 font-mono tracking-[0.4em] md:h-11"
        />
      </Field>
      {state.error ? <Alert variant="error" title={state.error} /> : null}
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {pending ? "Confirmando…" : "Confirmar e entrar"}
      </Button>
    </form>
  );
}

// Reenvio com o e-mail já conhecido (tela do código) ou digitado (/criar-conta/reenviar). Resposta sempre igual.
export function ResendForm({ email }: { email?: string }) {
  const [state, action, pending] = useActionState(resendConfirmationAction, {});

  return (
    <form action={action} className="grid gap-3" aria-busy={pending}>
      {email ? (
        <input type="hidden" name="email" value={email} />
      ) : (
        <Field label="E-mail" htmlFor="resend-email">
          <Input id="resend-email" name="email" type="email" autoComplete="email" maxLength={254} required className="h-12 px-3 md:h-11" />
        </Field>
      )}
      {state.error ? <Alert variant="error" title={state.error} /> : null}
      {state.sent ? (
        <Alert variant="success" title="Pedido recebido">
          Se existe uma conta esperando confirmação nesse e-mail, enviamos um link e um código novos. Vale por 30 minutos.
        </Alert>
      ) : null}
      <Button type="submit" variant="secondary" size={email ? "md" : "lg"} className="w-full" loading={pending}>
        {pending ? "Enviando…" : "Reenviar e-mail de confirmação"}
      </Button>
    </form>
  );
}
