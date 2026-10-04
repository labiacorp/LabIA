"use client";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteTemplate } from "./actions";
export function DeleteTemplate({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  const [error, action, pending] = useActionState(
    deleteTemplate.bind(null, id),
    "",
  );
  return confirm ? (
    <form action={action} className="grid gap-2">
      <p className="text-body-sm">
        Excluir este modelo? As produções continuam salvas.
      </p>
      <Button variant="secondary" loading={pending}>
        Confirmar exclusão
      </Button>
      <Button type="button" variant="ghost" onClick={() => setConfirm(false)}>
        Cancelar
      </Button>
      {error && <p role="alert">{error}</p>}
    </form>
  ) : (
    <Button variant="ghost" onClick={() => setConfirm(true)}>
      Excluir modelo
    </Button>
  );
}
