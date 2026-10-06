import { AuthShell } from "@/components/app/auth-shell";
import { Button } from "@/components/ui/button";
import { openTeamLink } from "../actions";

export const metadata = { title: "Acesso · LabIA", robots: { index: false } };

// A button, not an automatic redirect: mail scanners that open links must not spend the one-time token.
export default async function TeamLinkPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ erro?: string }> }) {
  const [{ token }, { erro }] = await Promise.all([params, searchParams]);
  return <AuthShell title="Entrada da equipe" description={erro ? "Este link já foi usado ou venceu. Peça outro pelo mesmo formulário." : "Toque no botão para abrir a entrada neste navegador."}>
    {erro ? null : <form action={openTeamLink.bind(null, token)}><Button size="lg" className="w-full">Abrir a entrada</Button></form>}
  </AuthShell>;
}
