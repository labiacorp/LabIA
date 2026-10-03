"use client";

import { useState } from "react";
import { Clapperboard, LayoutList, Loader2, Package, WandSparkles, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CostChip } from "@/components/ui/cost-chip";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FlowTemplate = "image-to-video" | "image-only" | "product-imported-to-video" | "product-production-blueprint";
type AspectRatio = "9:16" | "1:1" | "16:9";

type Template = { id: FlowTemplate; title: string; description: string; icon: LucideIcon; color: string; primary?: boolean; steps: { label: string; color: string }[] };
const templates: Template[] = [
  { id: "image-to-video", title: "Imagem-base → Vídeo curto", description: "Uma imagem gerada e animada em vídeo de 5s, 9:16.", icon: Clapperboard, color: "text-lab-node-video", primary: true, steps: [{ label: "Prompt", color: "bg-lab-node-image" }, { label: "Gerar imagem", color: "bg-lab-node-image" }, { label: "Animar imagem", color: "bg-lab-node-video" }] },
  { id: "image-only", title: "Imagem-base", description: "Uma imagem para o Projeto, sem vídeo.", icon: WandSparkles, color: "text-lab-node-image", steps: [{ label: "Prompt", color: "bg-lab-node-image" }, { label: "Gerar imagem", color: "bg-lab-node-image" }] },
  { id: "product-imported-to-video", title: "Produto importado → Vídeo curto", description: "Começa com uma imagem-base do Projeto e não gera imagem automaticamente.", icon: Package, color: "text-lab-info", steps: [{ label: "Imagem-base do Projeto", color: "bg-lab-info" }, { label: "Animar imagem", color: "bg-lab-node-video" }] },
  { id: "product-production-blueprint", title: "Blueprint de produção → Vídeo de produto", description: "Briefing, contexto, teste, revisão, continuidade e montagem em um único Flow.", icon: LayoutList, color: "text-lab-node-copy", steps: [{ label: "Blueprint", color: "bg-lab-node-design" }, { label: "Animar ×N", color: "bg-lab-node-video" }, { label: "Juntar clipes", color: "bg-lab-node-copy" }] },
];

type ProductProjectDraft = { name: string; objective: string; aspectRatio: AspectRatio; durationSeconds: number };

async function createTemplate(template: FlowTemplate, project?: ProductProjectDraft) {
  const response = await fetch("/api/flows", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "content-type": "application/json" }, body: JSON.stringify(project ? { template, project } : { template }) });
  const payload = (await response.json().catch(() => ({}))) as { flow?: { id?: unknown }; project?: { id?: unknown }; error?: unknown };
  if (!response.ok || typeof payload.flow?.id !== "string") throw new Error(typeof payload.error === "string" ? payload.error : "Não foi possível criar o fluxo.");
  return { flowId: payload.flow.id, projectId: typeof payload.project?.id === "string" ? payload.project.id : null };
}

async function createSimpleProject(template: FlowTemplate, project: ProductProjectDraft) {
  const response = await fetch("/api/projects", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: project.name, objective: project.objective || (template === "image-only" ? "Criar uma imagem-base." : "Criar uma imagem-base e animar em vídeo curto."), type: template === "image-only" ? "IMAGE" : "VIDEO", aspectRatio: project.aspectRatio, durationSeconds: template === "image-only" ? null : project.durationSeconds }) });
  const payload = (await response.json().catch(() => ({}))) as { project?: { id?: unknown; primaryFlowId?: unknown }; error?: unknown };
  if (!response.ok || typeof payload.project?.primaryFlowId !== "string") throw new Error(typeof payload.error === "string" ? payload.error : "Não foi possível criar o Projeto.");
  return { flowId: payload.project.primaryFlowId };
}

export function CreateWorkspace({ initialTemplate }: { initialTemplate?: string } = {}) {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate>(() => templates.find((template) => template.id === initialTemplate)?.id ?? "image-to-video");
  const [projectName, setProjectName] = useState("");
  const [projectObjective, setProjectObjective] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isProjectTemplate = selectedTemplate === "product-imported-to-video" || selectedTemplate === "product-production-blueprint";
  const selected = templates.find((template) => template.id === selectedTemplate)!;

  async function handleCreate(asProject = isProjectTemplate) {
    if (isCreating) return;
    if (asProject && !projectName.trim()) { setError("Informe um nome para o Projeto."); document.getElementById("project-name")?.focus(); return; }
    setIsCreating(true);
    setError(null);
    try {
      const project = { name: projectName.trim(), objective: projectObjective.trim(), aspectRatio, durationSeconds: 5 };
      const created = asProject && !isProjectTemplate ? await createSimpleProject(selectedTemplate, project) : await createTemplate(selectedTemplate, isProjectTemplate ? project : undefined);
      router.push(`/fluxos/${created.flowId}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Não foi possível criar o fluxo.");
      setIsCreating(false);
    }
  }

  const projectFields = (
    <>
      <label className="flex flex-col gap-1.5" htmlFor="project-name"><span className="font-mono text-eyebrow uppercase text-lab-text-muted">Nome do Projeto</span><Input id="project-name" name="project-name" value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Ex.: Bento · pote térmico" maxLength={160} aria-invalid={Boolean(error && !projectName.trim())} aria-describedby={error ? "create-error" : undefined} className="h-11 lg:h-10" /></label>
      <label className="flex flex-col gap-1.5" htmlFor="project-objective"><span className="font-mono text-eyebrow uppercase text-lab-text-muted">Objetivo do Projeto</span><textarea id="project-objective" name="project-objective" value={projectObjective} onChange={(event) => setProjectObjective(event.target.value)} placeholder="O que você quer produzir?" rows={3} maxLength={5000} className="min-h-20 w-full resize-y rounded-control border border-lab-border bg-lab-surface-2 px-3 py-2.5 text-sm leading-5 text-lab-text placeholder:text-lab-text-muted focus-visible:border-lab-border-strong focus-visible:outline-none focus-visible:shadow-lab-focus" /></label>
      <div className={cn("grid gap-3", selectedTemplate !== "image-only" && "grid-cols-[1fr_0.8fr]")}>
        <fieldset className="min-w-0"><legend className="mb-1.5 font-mono text-eyebrow uppercase text-lab-text-muted">Formato</legend><div className="flex gap-0.5 rounded-control border border-lab-border bg-lab-surface-2 p-0.5">{(["9:16", "1:1", "16:9"] as const).map((ratio) => <button key={ratio} type="button" aria-pressed={aspectRatio === ratio} onClick={() => setAspectRatio(ratio)} className={cn("h-11 min-w-0 flex-1 rounded-[6px] px-1 font-mono text-xs focus-visible:outline-none focus-visible:shadow-lab-focus lg:h-[30px]", aspectRatio === ratio ? "bg-lab-border-strong text-lab-text" : "text-lab-text-dim")}>{ratio}</button>)}</div></fieldset>
        {selectedTemplate !== "image-only" ? <div><p className="mb-1.5 font-mono text-eyebrow uppercase text-lab-text-muted">Duração</p><p className="flex h-12 items-center rounded-control border border-lab-border bg-lab-surface-2 px-3 font-mono text-[13px] lg:h-[38px]">5 segundos</p></div> : null}
      </div>
    </>
  );

  return (
    <main className="mx-auto w-full max-w-[1192px] flex-1 px-5 pb-32 pt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-10 lg:py-10">
      <section className="min-w-0">
        <h1 className="font-display text-[28px] font-bold leading-[34px] tracking-[-0.02em] lg:text-h1-lg">O que você quer criar?</h1>
        <p className="mt-2 text-[15px] text-lab-text-dim">Escolha uma receita. Nada é gerado nesta etapa.</p>
        <div className="mt-6 flex flex-col gap-2.5" role="radiogroup" aria-label="Template de fluxo">
          {templates.map((template) => {
            const active = selectedTemplate === template.id;
            const Icon = template.icon;
            return <div key={template.id} className={cn("rounded-lab border transition-colors", active ? "border-lab-reagent bg-lab-surface-1 shadow-[0_0_0_1px_var(--lab-reagent)]" : "border-lab-border bg-lab-bg hover:border-lab-border-strong")}>
              <button type="button" role="radio" aria-checked={active} data-template={template.id} onClick={() => { setSelectedTemplate(template.id); setError(null); }} className="flex w-full items-center gap-3 p-3.5 text-left focus-visible:outline-none focus-visible:shadow-lab-focus lg:gap-4 lg:px-[18px] lg:py-4">
                <span className={cn("hidden size-11 shrink-0 items-center justify-center rounded-control border border-lab-border bg-lab-surface-2 lg:flex", template.color)}><Icon className="size-[19px]" aria-hidden /></span>
                <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2.5"><Icon className={cn("size-[17px] shrink-0 lg:hidden", template.color)} aria-hidden /><span className="font-display text-sm font-medium lg:text-[17px]">{template.title}</span>{template.primary ? <Badge className="hidden h-5 border-lab-border-strong px-[7px] font-mono text-eyebrow uppercase xl:inline-flex">Recomendado</Badge> : null}</span><span className={cn("mt-1.5 text-[13px] text-lab-text-dim", active ? "block" : "hidden lg:block")}>{template.description}</span><span className="mt-1.5 hidden flex-wrap items-center gap-1.5 lg:flex">{template.steps.map((step) => <span key={step.label} className="inline-flex items-center gap-[5px] rounded-full border border-lab-border px-2 py-0.5 font-mono text-caption text-lab-text-dim"><i className={cn("size-1.5 rounded-sm", step.color)} aria-hidden />{step.label}</span>)}</span></span>
                <CostChip state="pending" size="sm" className="self-start lg:self-center" />
              </button>
              {active ? <div className="flex flex-col gap-3.5 px-3.5 pb-3.5 lg:hidden">{projectFields}</div> : null}
            </div>;
          })}
        </div>
        <p className="mt-4 hidden text-xs leading-5 text-lab-text-muted lg:block">O custo depende do modelo e das opções de cada nó. O valor estimado aparece na confirmação antes de rodar.</p>
      </section>
      <section className="mt-6 self-start lg:mt-0 lg:rounded-lab lg:border lg:border-lab-border lg:bg-lab-surface-1 lg:p-6" aria-label="Dados do Projeto">
        <div className="hidden lg:block"><p className="font-mono text-eyebrow uppercase text-lab-text-muted">Novo Projeto</p><h2 className="mt-1 font-display text-xl font-medium">{selected.title}</h2></div>
        <div className="mt-[18px] hidden flex-col gap-[18px] lg:flex">{projectFields}</div>
        <div className="mt-[18px] hidden items-center justify-between gap-3 rounded-control border border-lab-border px-3.5 py-3 lg:flex"><span className="text-[13px] text-lab-text-dim">Custo típico ao rodar</span><CostChip state="pending" className="border-0 px-0" /></div>
        {error ? <p id="create-error" role="alert" className="mt-4 rounded-control border border-lab-danger-line bg-lab-danger-dim px-3 py-2 text-sm text-lab-danger">{error}</p> : null}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-lab-border bg-lab-surface-1 px-5 pb-5 pt-3 lg:static lg:mt-[18px] lg:border-0 lg:p-0">
          <Button type="button" className="h-12 min-h-11 w-full text-[15px] lg:h-11" onClick={() => void handleCreate(true)} disabled={isCreating} data-id={isProjectTemplate ? "create-template" : "create-project"}>{isCreating ? <Loader2 className="animate-spin" aria-hidden /> : null}{isCreating ? "Criando Projeto…" : <>Criar Projeto<span className="sr-only"> e abrir canvas</span></>}</Button>
          {!isProjectTemplate ? <Button type="button" variant="ghost" className="mt-2 hidden h-10 min-h-11 w-full lg:inline-flex" onClick={() => void handleCreate(false)} disabled={isCreating} data-id="create-template">{isCreating ? "Criando fluxo…" : "Editar no canvas"}</Button> : null}
        </div>
      </section>
    </main>
  );
}
