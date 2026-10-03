import { redirect } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { gateMode } from "@/lib/access";
import { AccessForm } from "./access-form";

export const metadata = { title: "Acesso · LabIA" };

export default function AccessPage() {
  const mode = gateMode();
  if (mode === "off") redirect("/login");

  return (
    <main className="mx-auto flex min-h-screen max-w-form flex-col justify-center gap-6 px-5">
      <div>
        <p className="lab-wordmark text-h1">Lab<span>IA</span></p>
        <h1 className="mt-4 font-display text-h2">Acesso restrito</h1>
        <p className="mt-1 text-body-sm text-lab-text-dim">O LabIA está em beta fechado. Digite o código que você recebeu.</p>
      </div>
      {mode === "closed" ? <Alert variant="warning" title="O acesso está indisponível neste momento." /> : <AccessForm />}
    </main>
  );
}
