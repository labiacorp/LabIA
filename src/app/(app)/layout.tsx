import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CostChip } from "@/components/ui/cost-chip";
import { getBalanceBrl } from "@/lib/ledger";
import { requireUserId } from "@/lib/session";
import { logout } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userId = await requireUserId();
  const balance = await getBalanceBrl(userId).then((value) => ({ ok: true as const, value })).catch(() => ({ ok: false as const }));

  return (
    <>
      <header className="sticky top-0 z-header flex h-header items-center gap-8 border-b border-lab-border bg-lab-surface-1 px-5 md:px-6">
        <Link href="/" aria-label="LabIA, início" className="lab-wordmark rounded-control focus-visible:outline-none focus-visible:shadow-lab-focus">Lab<span>IA</span></Link>
        <nav aria-label="Navegação principal" className="hidden md:block">
          <Link href="/" className="flex h-8 items-center rounded-control bg-lab-surface-2 px-3 text-body-sm font-medium">Estúdio de influencers</Link>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          {balance.ok ? <CostChip state="actual" plain value={balance.value} prefix="saldo" /> : <CostChip state="unavailable" prefix="saldo" />}
          <form action={logout}><Button variant="ghost" size="sm">Sair</Button></form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-wide px-3 pb-16 pt-4 md:px-6">{children}</main>
    </>
  );
}
