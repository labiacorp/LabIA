import { redirect } from "next/navigation";

import { AuthShell } from "@/components/app/auth-shell";
import { Alert } from "@/components/ui/alert";
import { gateMode } from "@/lib/access";
import { accessOpen } from "@/auth";
import { AccessForm } from "./access-form";

export const metadata = { title: "Acesso · LabIA", robots: { index: false } };

export default function AccessPage() {
  const mode = gateMode();
  if (mode === "off" && accessOpen()) redirect("/login");

  return (
    <AuthShell title="Código de acesso" description={accessOpen() ? "O LabIA está em acesso por convite. Digite o código que você recebeu." : "Entrada da equipe. Digite o código."}>
      {mode !== "on" ? <Alert variant="warning" title="O acesso está indisponível neste momento." /> : <AccessForm />}
    </AuthShell>
  );
}
