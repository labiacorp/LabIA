"use client";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export default function AppError({ reset }: { reset: () => void }) {
  return <div className="mx-auto max-w-content py-8"><Alert variant="error" title="Não conseguimos carregar esta página.">Seus dados continuam salvos. Tente novamente em instantes.</Alert><Button className="mt-4" variant="secondary" onClick={reset}>Tentar novamente</Button></div>;
}
