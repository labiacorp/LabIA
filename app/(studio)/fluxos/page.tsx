import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CostChip } from "@/components/ui/cost-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { FlowCard } from "@/components/flows/flow-card";
import { listRecentFlows } from "@/lib/db/flows";
export const dynamic = "force-dynamic";
export default async function FlowsPage({searchParams}: {searchParams?:Promise<{q?:string}>}) {
  const q=(await searchParams)?.q ?? "";
  const flows=await listRecentFlows(48,q);
  const projects=new Set(flows.map(flow=>flow.project?.id).filter(Boolean));
  return <main className="mx-auto flex w-full max-w-[1216px] flex-1 flex-col gap-6 px-5 py-5 lg:px-8 lg:py-10">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="font-display text-[28px] font-bold tracking-tight sm:text-h1">Fluxos</h1><p className="mt-1.5 text-body-sm text-lab-text-dim">{flows.length} {flows.length === 1 ? "fluxo recente" : "fluxos recentes"}{projects.size ? ` em ${projects.size} ${projects.size === 1 ? "Projeto" : "Projetos"}` : ""}</p></div>
      <div className="flex flex-wrap gap-2.5">
        <form action="/fluxos" className="flex min-w-0 flex-1 items-center gap-2 rounded-control border border-lab-border bg-lab-surface-1 px-3 sm:w-[280px]">
          <button aria-label="Buscar fluxos" className="text-lab-text-muted"><Search className="size-4" aria-hidden /></button>
          <input name="q" defaultValue={q} type="search" aria-label="Buscar por nome ou Projeto" placeholder="Buscar por nome ou Projeto" className="h-11 min-w-0 flex-1 bg-transparent text-body-sm outline-none placeholder:text-lab-text-muted sm:h-9" />
        </form>
        <Button asChild variant="secondary" className="hidden border-lab-border-strong sm:inline-flex"><Link href="/criar"><Plus />Novo fluxo</Link></Button>
      </div>
    </header>
    {flows.length ? <section aria-label="Seus fluxos" className="grid gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">{flows.map(flow=><FlowCard key={flow.id} flow={flow} />)}</section> :
      <EmptyState title={q ? "Nenhum fluxo encontrado" : "Nenhum fluxo ainda"} description={q ? "Tente outro nome de fluxo ou Projeto." : "Comece pela receita mais usada: uma imagem do produto vira um vídeo curto de 5s."} action={q ? <Button asChild variant="secondary"><Link href="/fluxos">Limpar busca</Link></Button> : <><Button asChild><Link href="/criar">Imagem-base → Vídeo curto</Link></Button><CostChip state="pending" /></>} />}
  </main>;
}
