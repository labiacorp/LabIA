"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { setArchive } from "./management";
export function ArchiveControl({
  id,
  archived,
}: {
  id: string;
  archived: boolean;
}) {
  const [error, action, pending] = useActionState(
    setArchive.bind(null, id, !archived),
    "",
  );
  return (
    <form action={action} className="grid gap-2">
      <Button type="submit" variant="secondary" loading={pending}>
        {archived ? "Restaurar conteúdo" : "Arquivar conteúdo"}
      </Button>
      {error && (
        <p role="alert" className="text-body-sm text-lab-danger">
          {error}
        </p>
      )}
    </form>
  );
}
