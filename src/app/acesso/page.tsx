import { redirect } from "next/navigation";

import { AuthShell } from "@/components/app/auth-shell";
import { Alert } from "@/components/ui/alert";
import { gateMode } from "@/lib/access";
import { AccessForm } from "./access-form";

export const metadata = { title: "Acesso · LabIA" };

export default function AccessPage() {
  const mode = gateMode();
  if (mode === "off") redirect("/login");

  return (
    <AuthShell title="Código de acesso" description="O LabIA está em acesso por convite. Digite o código que você recebeu.">
      {mode === "closed" ? <Alert variant="warning" title="O acesso está indisponível neste momento." /> : <AccessForm />}
    </AuthShell>
  );
}
