"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { reviewContent } from "./management-actions";
export function ReviewForm({
  influencerId,
  contentId,
  status,
}: {
  influencerId: string;
  contentId: string;
  status: string;
}) {
  const [state, action, pending] = useActionState(
    reviewContent.bind(null, influencerId, contentId),
    { error: "", message: "" },
  );
  return (
    <form action={action} className="grid gap-3">
      <h2 className="font-display text-lg">Revisão do vídeo final</h2>
      <div className="flex flex-wrap gap-2">
        <Button
          size="lg"
          name="decision"
          value="APPROVED"
          disabled={pending || status === "APPROVED"}
        >
          Aprovar vídeo
        </Button>
        <Button
          size="lg"
          variant="secondary"
          name="decision"
          value="REJECTED"
          disabled={pending || status === "REJECTED"}
        >
          Precisa de ajustes
        </Button>
        {status !== "REVIEW" ? (
          <Button
            size="lg"
            variant="ghost"
            name="decision"
            value="REVIEW"
            disabled={pending}
          >
            Voltar à revisão
          </Button>
        ) : null}
      </div>
      {state.message || state.error ? (
        <p role={state.error ? "alert" : "status"} className="text-body-sm">
          {state.error || state.message}
        </p>
      ) : null}
    </form>
  );
}
