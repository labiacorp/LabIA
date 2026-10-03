import { LibraryView, type FilterGroup, type LibraryAsset, type LibraryFilters } from "@/components/library/library-view";
import { ErrorState } from "@/components/ui/error-state";
import { hasDatabaseEnv } from "@/lib/db/env";
import { prisma } from "@/lib/db/prisma";
import { getOwnedExecutionScope } from "@/lib/flows/ownership";
import { FAL_IMAGE_MODELS, FAL_VIDEO_MODELS } from "@/lib/providers/fal-models";

type LibraryPageProps = {
  searchParams?: Promise<{ project?: string; type?: string; provider?: string; model?: string; date?: string }>;
};

function decimalToNumber(value: { toString(): string } | null | undefined) {
  if (value == null) return null;
  const number = Number(value.toString());
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function getDateStart(filter: string | undefined) {
  const now = new Date();
  if (filter === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (filter === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return undefined;
}

function modelName(modelId: string | null) {
  if (!modelId) return "Modelo não informado";
  const known = [...FAL_IMAGE_MODELS, ...FAL_VIDEO_MODELS].find((model) => model.id === modelId);
  if (known) return known.name;
  if (modelId === "gpt-image-1") return "GPT Image 1";
  return modelId.split("/").filter(Boolean).at(-1)?.replace(/[-_]+/g, " ") ?? "Modelo não informado";
}

function providerModelLabel(provider: string | null, modelId: string | null) {
  const providerName = provider === "fal" ? "fal.ai" : provider === "openai" ? "OpenAI" : provider?.replace(/[-_]+/g, " ");
  return `${modelName(modelId)}${providerName ? ` · ${providerName}` : ""}`;
}

function LibraryUnavailable() {
  return <main className="mx-auto flex w-full max-w-[1192px] flex-1 flex-col gap-6 px-5 py-5 sm:py-8"><h1 className="font-display text-[28px] font-bold tracking-[-0.02em] sm:text-[32px]">Biblioteca</h1><ErrorState title="Não foi possível carregar a Biblioteca" description="A biblioteca está indisponível neste momento. Tente novamente em instantes." /></main>;
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const params = (await searchParams) ?? {};
  const selectedProject = params.project ?? "all";
  const selectedType = params.type === "IMAGE" || params.type === "VIDEO" ? params.type : "all";
  const selectedProvider = params.provider ?? "all";
  const selectedModel = params.model ?? "all";
  const selectedDate = ["today", "7d", "30d"].includes(params.date ?? "") ? params.date! : "all";
  const filters: LibraryFilters = { project: selectedProject, type: selectedType, provider: selectedProvider, model: selectedModel, date: selectedDate };

  if (!hasDatabaseEnv()) return <LibraryUnavailable />;

  try {
  const supportsProjectRelations = Boolean((prisma as unknown as { project?: unknown }).project);
  const scope = supportsProjectRelations ? await getOwnedExecutionScope() : null;
  const projects = supportsProjectRelations
    ? await prisma.project.findMany({
        where: { workspaceId: scope?.workspaceId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];
  const dateStart = getDateStart(selectedDate);
  const assets = await prisma.asset.findMany({
    where: {
      ...(scope ? { workspaceId: scope.workspaceId } : {}),
      ...(selectedProject === "none" ? { projectId: null } : selectedProject !== "all" ? { projectId: selectedProject } : {}),
      ...(selectedType === "all" ? { type: { in: ["IMAGE", "VIDEO"] } } : { type: selectedType }),
      ...(selectedProvider !== "all" ? { provider: selectedProvider } : {}),
      ...(selectedModel !== "all" ? { model: selectedModel } : {}),
      ...(dateStart
        ? {
            createdAt: {
              gte: dateStart,
            },
          }
        : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      generation: true,
      project: { select: { id: true, name: true } },
    },
    take: 80,
  });
  const providerModelSource = supportsProjectRelations
    ? await prisma.asset.findMany({
        where: { workspaceId: scope?.workspaceId },
        select: { provider: true, model: true },
        distinct: ["provider", "model"],
      })
    : assets;

    const uniqueModels = Array.from(new Map(providerModelSource.filter((asset) => asset.provider || asset.model).map((asset) => [`${asset.provider ?? ""}:${asset.model ?? ""}`, { provider: asset.provider, model: asset.model }])).values());
    const groups: FilterGroup[] = [
      { key: "project", label: "Projeto", options: [{ value: "all", label: "Todos" }, ...projects.map((project) => ({ value: project.id, label: project.name })), { value: "none", label: "Sem projeto" }] },
      { key: "type", label: "Tipo", options: [{ value: "all", label: "Tudo" }, { value: "IMAGE", label: "Imagens" }, { value: "VIDEO", label: "Vídeos" }] },
      { key: "model", label: "Modelo", options: [{ value: "all", label: "Todos", provider: "all", model: "all" }, ...uniqueModels.map((option) => ({ value: `${option.provider ?? ""}:${option.model ?? ""}`, label: providerModelLabel(option.provider, option.model), provider: option.provider, model: option.model }))] },
      { key: "date", label: "Período", options: [{ value: "all", label: "Tudo" }, { value: "today", label: "Hoje" }, { value: "7d", label: "7 dias" }, { value: "30d", label: "30 dias" }] },
    ];
    const libraryAssets: LibraryAsset[] = assets.map((asset) => {
      const metadata = asset.metadata && typeof asset.metadata === "object" && !Array.isArray(asset.metadata) ? asset.metadata : {};
      return {
        id: asset.id,
        type: asset.type,
        url: asset.url,
        origin: asset.origin,
        provider: asset.provider,
        model: asset.model,
        modelLabel: asset.origin === "UPLOADED" ? "Importado" : providerModelLabel(asset.provider, asset.model),
        prompt: asset.prompt ?? asset.generation?.prompt ?? "",
        originalFileName: typeof metadata.originalFileName === "string" ? metadata.originalFileName : null,
        createdAt: asset.createdAt.toISOString(),
        width: asset.width,
        height: asset.height,
        project: asset.project ?? null,
        actualCost: decimalToNumber(asset.generation?.actualCostBrl),
        estimatedCost: decimalToNumber(asset.generation?.estimatedCostBrl),
      };
    });
    return <LibraryView assets={libraryAssets} filters={filters} groups={groups} />;
  } catch (error) {
    console.error("[biblioteca] falha ao carregar", error);
    return <LibraryUnavailable />;
  }
}
