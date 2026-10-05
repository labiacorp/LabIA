"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { logout } from "../actions";

export function SessionControls() {
  const [error, action, pending] = useActionState(async () => {
    try {
      await logout();
      return "";
    } catch (error) {
      if (
        error instanceof Error &&
        "digest" in error &&
        String(error.digest).startsWith("NEXT_REDIRECT")
      )
        throw error;
      return "Não conseguimos encerrar as sessões. Tente novamente.";
    }
  }, "");
  return (
    <form action={action} className="mt-5 grid gap-3">
      <label className="flex items-start gap-3 text-body-sm leading-6">
        <input
          type="checkbox"
          required
          className="mt-1 size-5 shrink-0 accent-lab-reagent"
        />
        Quero sair de todos os navegadores, incluindo este.
      </label>
      <Button type="submit" variant="secondary" size="lg" loading={pending}>
        Encerrar todas as sessões
      </Button>
      {error && (
        <p role="alert" className="text-body-sm text-lab-danger">
          {error}
        </p>
      )}
    </form>
  );
}
