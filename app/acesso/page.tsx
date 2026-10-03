import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccessForm } from "@/app/acesso/access-form";
import { AuthTitle } from "@/components/auth/auth-parts";
import { AuthShell } from "@/components/auth/auth-shell";
import { Alert } from "@/components/ui/alert";
import { gateMode } from "@/lib/auth/access-gate";
import { safeNextPath } from "@/lib/auth/next-path";

export const metadata: Metadata = { title: "Acesso · LabIA" };

export default async function AcessoPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const mode = gateMode();
  // No gate configured (local development): nothing to unlock.
  if (mode === "off") redirect("/entrar");
  const { next } = await searchParams;
  // Anything but an internal path falls back to the sign-in form, not to the post-login default.
  const target = typeof next === "string" && next.startsWith("/") ? safeNextPath(next) : "/entrar";

  return (
    <AuthShell>
      <AuthTitle title="Acesso restrito">O LabIA está em beta fechado. Digite o código que você recebeu.</AuthTitle>
      {mode === "closed" ? (
        <div className="mt-4">
          <Alert variant="warning" title="O acesso está indisponível neste momento." />
        </div>
      ) : (
        <AccessForm next={target} />
      )}
    </AuthShell>
  );
}
