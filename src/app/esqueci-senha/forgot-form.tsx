"use client";
import { useActionState } from "react";
import { CircleAlert, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "./actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, { error: "" });
  if (state.sent) return <div role="status" className="flex gap-3 rounded-card bg-lab-surface-1 p-4 text-[15px] leading-[1.5] shadow-[inset_0_0_0_1px_var(--lab-border-strong)]"><MailCheck className="size-[22px] shrink-0" aria-hidden />Se existir uma conta com este e-mail, o link chega em instantes. Ele vale por 1 hora.</div>;
  return <form action={action} className="flex flex-col gap-5">
    <p className="text-[15px] leading-[1.5] text-lab-text-dim">Mandamos um link para criar uma senha nova.</p>
    <label className="flex flex-col gap-2"><span className="text-body-sm font-medium">E-mail da conta</span><Input name="email" type="email" required autoComplete="email" placeholder="voce@exemplo.com" aria-invalid={!!state.error} /></label>
    {state.error ? <p role="alert" className="flex items-center gap-1.5 text-[13px] text-lab-danger"><CircleAlert className="size-3.5" aria-hidden />{state.error}</p> : null}
    <Button className="h-14 w-full text-body" loading={pending}>Enviar link</Button>
  </form>;
}
