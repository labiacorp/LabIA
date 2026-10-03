import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";

import { ProjectCard } from "@/components/projects/project-card";
import { projectStatus } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { getOwnedExecutionScope } from "@/lib/flows/ownership";
import { listProjects } from "@/lib/projects";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const selectedStatus = (await searchParams).status ?? "all";
  const result = await getOwnedExecutionScope().then(listProjects).then((projects) => ({ projects, error: false })).catch(() => ({ projects: [], error: true }));
  const projects = result.projects;
  const visibleProjects = selectedStatus in projectStatus ? projects.filter((project) => project.status === selectedStatus) : projects;
  const tabs = [{ value: "all", label: "Todos", count: projects.length }, ...Object.entries(projectStatus).map(([value, [, label]]) => ({ value, label, count: projects.filter((project) => project.status === value).length }))];

  return (
    <main className="mx-auto flex w-full max-w-[1192px] flex-1 flex-col gap-4 px-5 pb-28 pt-5 sm:gap-6 sm:py-10">
      <div className="flex items-end justify-between gap-4">
        <div><h1 className="font-display text-[28px] font-bold tracking-[-0.02em] sm:text-[32px]">Projetos</h1><p className="mt-1.5 hidden text-sm text-lab-text-dim sm:block">Peças que você quer aprovar.</p></div>
        <Button asChild className="hidden sm:inline-flex"><Link href="/criar"><Plus />Novo Projeto</Link></Button>
      </div>
      {result.error ? <ErrorState title="Não foi possível carregar seus Projetos" description="O banco não respondeu. Tente novamente em instantes." /> : <>
        <nav aria-label="Status dos projetos" className="flex gap-1.5 overflow-x-auto pb-1">
          {tabs.map((tab) => <Link key={tab.value} href={tab.value === "all" ? "/projetos" : `/projetos?status=${tab.value}`} aria-current={selectedStatus === tab.value ? "page" : undefined} className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-control border px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:shadow-lab-focus sm:h-8 ${selectedStatus === tab.value ? "border-lab-border-strong bg-lab-surface-2 text-lab-text" : "border-lab-border text-lab-text-dim hover:border-lab-border-strong hover:text-lab-text"}`}>{tab.label}<span className="font-mono text-caption text-lab-text-muted">{tab.count}</span></Link>)}
        </nav>
        {visibleProjects.length ? <section aria-label="Seus projetos" className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">{visibleProjects.map((project) => <ProjectCard key={project.id} project={project} />)}</section> : <EmptyState icon={FolderKanban} title={projects.length ? "Nenhum Projeto com este status" : "Nenhum Projeto ainda"} description={projects.length ? "Escolha outro status para encontrar suas peças." : "Um Projeto guarda objetivo, formato, fontes e resultados de uma peça. Comece pelo produto que você quer mostrar."} action={<Button asChild variant={projects.length ? "secondary" : "primary"}><Link href={projects.length ? "/projetos" : "/criar"}>{projects.length ? "Ver todos os Projetos" : "Criar meu primeiro Projeto"}</Link></Button>} />}
      </>}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-lab-border bg-lab-surface-1 px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 sm:hidden"><Button asChild className="h-12 w-full"><Link href="/criar"><Plus />Novo Projeto</Link></Button></div>
    </main>
  );
}
