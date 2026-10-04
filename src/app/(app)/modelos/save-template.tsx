"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { saveTemplate } from "./actions";
export function SaveTemplate({ contentId }: { contentId: string }) {
  const [state, action, pending] = useActionState(
    saveTemplate.bind(null, contentId),
    { error: "", message: "" },
  );
  return (
    <form action={action} className="grid gap-2">
      <Button type="submit" size="lg" variant="secondary" loading={pending}>
        Salvar como modelo
      </Button>
      {state.error && (
        <p role="alert" className="text-body-sm text-lab-danger">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="text-body-sm text-lab-success">
          {state.message}{" "}
          <Link href="/modelos" className="underline">
            Ver meus modelos
          </Link>
        </p>
      )}
    </form>
  );
}
