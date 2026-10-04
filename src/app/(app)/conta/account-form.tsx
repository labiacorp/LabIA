"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateAccount } from "./actions";

export function AccountForm({ name }: { name: string | null }) {
  const [state, action, pending] = useActionState(updateAccount, { message: "", ok: false });
  return <form action={action} className="grid gap-4"><label className="grid gap-2 text-body-sm">Como podemos chamar você?<Input name="name" defaultValue={name ?? ""} required maxLength={80} autoComplete="name" aria-describedby={state.message ? "account-feedback" : undefined} /></label><div><Button type="submit" size="lg" loading={pending}>Salvar nome</Button></div>{state.message ? <p id="account-feedback" role={state.ok ? "status" : "alert"} className={`text-body-sm ${state.ok ? "text-lab-success" : "text-lab-danger"}`}>{state.message}</p> : null}</form>;
}
