import { redirect } from "next/navigation";

import { getSessionPrincipal } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// Toda tela do studio exige login e workspace. O middleware já barra quem não tem sessão;
// aqui fica a checagem de membro, que precisa do banco.
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const principal = await getSessionPrincipal();
  if (!principal) redirect("/entrar");
  if (!principal.workspace) redirect("/sem-acesso");
  return children;
}
