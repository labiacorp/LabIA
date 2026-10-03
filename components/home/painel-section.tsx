import Link from "next/link";
import { Clapperboard, CloudOff, DatabaseZap, Package, Plus, WandSparkles } from "lucide-react";

import { FlowCard } from "@/components/flows/flow-card";
import { ProjectCard } from "@/components/projects/project-card";
import { Button } from "@/components/ui/button";
import { CostChip } from "@/components/ui/cost-chip";
import { DashboardRetry } from "@/components/home/dashboard-retry";
import type { listRecentFlows } from "@/lib/db/flows";
import { formatBrl } from "@/lib/format";
import type { listProjects } from "@/lib/projects";

export type RecentFlow = Awaited<ReturnType<typeof listRecentFlows>>[number];
type RecentProject = Awaited<ReturnType<typeof listProjects>>[number];

type PainelSectionProps = {
  id: string;
  flows: RecentFlow[];
  projects: RecentProject[];
  monthSpend: number | null;
  generationCount: number | null;
  name: string;
  loadError?: boolean;
};

const quickRecipes = [
  { id: "image-to-video", name: "Imagem-base → Vídeo curto", description: "Gera e anima · 5s", icon: Clapperboard, color: "text-lab-node-video" },
  { id: "product-imported-to-video", name: "Produto importado → Vídeo", description: "Sua foto vira 5s", icon: Package, color: "text-lab-info" },
  { id: "image-only", name: "Imagem-base", description: "Uma imagem para o Projeto", icon: WandSparkles, color: "text-lab-node-image" },
];

export function PainelSection({ id, flows, projects, monthSpend, generationCount, name, loadError = false }: PainelSectionProps) {
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en", { hour: "numeric", hourCycle: "h23", timeZone: "America/Sao_Paulo" }).format(now));
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const month = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "America/Sao_Paulo" }).format(now);
  const date = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(now).replace("-feira", "");
  const reviewCount = projects.filter((project) => project.status === "REVIEW").length;
  const runningCount = flows.filter((flow) => flow.runs[0]?.status === "running").length;
  const status = reviewCount || runningCount
    ? `${reviewCount} ${reviewCount === 1 ? "Projeto em revisão" : "Projetos em revisão"} e ${runningCount} ${runningCount === 1 ? "fluxo rodando" : "fluxos rodando"}.`
    : "Sua produção, organizada em um só lugar.";

  return (
    <main id={id} className="mx-auto flex w-full max-w-[1192px] flex-1 flex-col gap-6 px-5 py-6 md:gap-10 md:py-10">
      <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-8">
        <div className="flex min-w-0 flex-col gap-1.5 md:gap-2">
          <p className="hidden font-mono text-eyebrow uppercase text-lab-text-muted md:block">{date}</p>
          <h1 className="font-display text-[28px] font-bold leading-[34px] tracking-[-0.02em] md:text-h1">{greeting}, {name.split(" ")[0]}.</h1>
          <p className="text-sm text-lab-text-dim">{loadError ? "Criar continua disponível." : status}</p>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-8 rounded-lab border border-lab-border bg-lab-surface-1 px-4 py-3.5 md:px-5 md:py-4">
          <div className="flex flex-col gap-0.5">
            <p className="font-mono text-eyebrow uppercase text-lab-text-muted"><span className="hidden md:inline">Gasto em </span>{month}</p>
            <p className="hidden font-mono text-cost-lg text-lab-reagent-bright md:block">{monthSpend === null ? <span className="inline-flex items-center gap-2 text-sm text-lab-text-muted"><CloudOff className="size-4" aria-hidden />indisponível</span> : formatBrl(monthSpend).replace(/\s/g, "")}</p>
            <p className="text-xs text-lab-text-dim md:hidden">{generationCount === null ? "Gerações indisponíveis" : `${generationCount} ${generationCount === 1 ? "geração" : "gerações"}`}</p>
          </div>
          <div className="hidden flex-col gap-1 border-l border-lab-border pl-5 text-xs text-lab-text-dim md:flex"><span>{generationCount === null ? "Gerações indisponíveis" : `${generationCount} ${generationCount === 1 ? "geração" : "gerações"}`}</span><Link href="/biblioteca" className="text-lab-text underline underline-offset-4">Ver na Biblioteca</Link></div>
          <span className="font-mono text-2xl font-semibold text-lab-reagent-bright md:hidden">{monthSpend === null ? <CloudOff className="size-5 text-lab-text-muted" aria-label="Gasto indisponível" /> : formatBrl(monthSpend).replace(/\s/g, "")}</span>
        </div>
      </section>

      <Button asChild size="lg" className="h-12 text-[15px] md:hidden"><Link href="/criar"><Plus aria-hidden />Criar</Link></Button>
      <section className="hidden flex-col gap-3.5 md:flex">
        <div className="flex items-baseline justify-between gap-3"><h2 className="font-display text-h3">Criar</h2><Link href="/criar" className="text-[13px] underline underline-offset-4">Todas as receitas</Link></div>
        <div className="grid grid-cols-3 gap-3">
          {quickRecipes.map(({ id: template, name: title, description, icon: Icon, color }) => <Link key={template} href={`/criar?receita=${template}`} className="flex min-w-0 items-center gap-3.5 rounded-lab border border-lab-border bg-lab-surface-1 px-4 py-3.5 transition-colors hover:border-lab-border-strong focus-visible:outline-none focus-visible:shadow-lab-focus"><span className={`flex size-10 shrink-0 items-center justify-center rounded-control border border-lab-border bg-lab-surface-2 ${color}`}><Icon className="size-[18px]" aria-hidden /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{title}</span><span className="mt-0.5 block text-xs text-lab-text-dim">{description}</span></span><CostChip state="pending" size="sm" className="hidden xl:inline-flex" /></Link>)}
        </div>
      </section>

      {loadError ? <section role="alert" className="flex flex-wrap items-start gap-3.5 rounded-lab border border-lab-danger-line bg-lab-surface-1 p-[18px]"><DatabaseZap className="size-5 shrink-0 text-lab-danger" aria-hidden /><div className="min-w-0 flex-1 basis-48"><h2 className="font-display text-base font-medium">Não conseguimos carregar seus Projetos e fluxos</h2><p className="mt-1 text-[13px] leading-[18px] text-lab-text-dim">O banco não respondeu. Nada foi perdido. Criar continua disponível.</p></div><DashboardRetry /></section> : null}

      {!loadError && projects.length === 0 && flows.length === 0 ? (
        <section className="rounded-lab border border-lab-border bg-lab-surface-1 p-6 md:p-9"><h2 className="font-display text-[28px] font-bold tracking-[-0.02em]">A bancada está limpa.</h2><p className="mt-4 max-w-[500px] text-[15px] leading-6 text-lab-text-dim">Comece com a receita mais usada: suba a foto do produto e ela vira um vídeo curto de 5s. Você vê o custo antes de rodar.</p><div className="mt-4 flex flex-wrap items-center gap-3"><Button asChild size="lg"><Link href="/criar?receita=product-imported-to-video"><Clapperboard aria-hidden />Produto importado → Vídeo curto</Link></Button><CostChip state="pending" /><Link href="/criar" className="text-[13px] underline underline-offset-4">Ver outras receitas</Link></div></section>
      ) : !loadError ? (
        <section className="grid min-w-0 gap-6 md:grid-cols-[1.25fr_1fr] md:gap-8">
          <div className="min-w-0"><div className="mb-3.5 flex items-baseline justify-between gap-3"><h2 className="font-display text-[17px] font-medium md:text-h3">Projetos recentes</h2><Link href="/projetos" className="text-[13px] underline underline-offset-4">Ver todos</Link></div><div className="flex gap-2.5 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:gap-3">{projects.slice(0, 3).map((project) => <ProjectCard key={project.id} project={project} dashboard />)}</div>{projects.length === 0 ? <p className="rounded-lab border border-dashed border-lab-border-strong p-6 text-sm text-lab-text-dim">Crie um Projeto para organizar fontes, fluxos e resultados.</p> : null}</div>
          <div className="min-w-0"><div className="mb-3.5 flex items-baseline justify-between gap-3"><h2 className="font-display text-[17px] font-medium md:text-h3">Fluxos recentes</h2><Link href="/fluxos" className="text-[13px] underline underline-offset-4">Ver todos</Link></div>{flows.length ? <div className="overflow-hidden rounded-lab border border-lab-border bg-lab-surface-1">{flows.map((flow) => <FlowCard key={flow.id} flow={flow} compact />)}</div> : <p className="rounded-lab border border-dashed border-lab-border-strong p-6 text-sm text-lab-text-dim">Escolha uma receita para começar seu primeiro fluxo.</p>}</div>
        </section>
      ) : null}
    </main>
  );
}
