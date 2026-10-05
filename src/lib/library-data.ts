import { ROLE_LABEL } from "@/lib/character";
import {
  LIBRARY_PAGE_SIZE,
  libraryWhere,
  type LibraryFilters,
} from "@/lib/library";
import { prisma } from "@/lib/prisma";
import {
  findFalImageModel,
  findFalVideoModel,
} from "@/lib/providers/fal-models";
import { MERGE_MODEL, METADATA_MODEL } from "@/lib/providers/ffmpeg";

function modelLabel(id: string | null) {
  if (id === "higgsfield/genjutsu/motion-transfer/v1.0") return "Genjutsu Motion Transfer · Higgsfield";
  if (id === MERGE_MODEL) return "Montagem de vídeo · fal.ai";
  if (id === METADATA_MODEL) return "Quadro de continuidade · fal.ai";
  const model = id ? (findFalImageModel(id) ?? findFalVideoModel(id)) : null;
  return model
    ? `${model.name.replace("edicao com referencia", "edição com referência")} · fal.ai`
    : "Modelo não informado";
}

function cost(value: { toString(): string } | null | undefined) {
  const result = value == null ? null : Number(value.toString());
  return result !== null && Number.isFinite(result) && result >= 0
    ? result
    : null;
}

function promptOf(input: unknown) {
  const data = input as {
    prompt?: unknown;
    chain?: { prompt?: unknown };
  } | null;
  const prompt = data?.chain?.prompt ?? data?.prompt;
  return typeof prompt === "string" ? prompt : "";
}

export async function loadLibrary(userId: string, filters: LibraryFilters) {
  const where = libraryWhere(userId, filters);
  const [influencers, total] = await Promise.all([
    prisma.influencer.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.asset.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / LIBRARY_PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  const assets = await prisma.asset.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * LIBRARY_PAGE_SIZE,
    take: LIBRARY_PAGE_SIZE,
    include: {
      influencer: { select: { id: true, name: true } },
      content: { select: { id: true, title: true, influencerId: true } },
      step: {
        select: {
          kind: true,
          model: true,
          input: true,
          actualCostBrl: true,
          estimatedCostBrl: true,
        },
      },
    },
  });
  return {
    influencers,
    total,
    pages,
    page,
    assets: assets.map((asset) => ({
      id: asset.id,
      kind: asset.kind,
      url: asset.url,
      title:
        asset.fileName ??
        (asset.role
          ? ROLE_LABEL[asset.role]
          : asset.step?.kind === "ASSEMBLY"
            ? "Vídeo final"
            : (asset.content?.title ??
              (asset.kind === "AUDIO"
                ? "Áudio"
                : asset.kind === "VIDEO"
                  ? "Clipe de vídeo"
                  : "Imagem da cena"))),
      role: asset.role,
      influencer: asset.influencer,
      content: asset.content,
      createdAt: asset.createdAt.toISOString(),
      width: asset.width,
      height: asset.height,
      duration: asset.durationSec,
      modelLabel: asset.storageKey
        ? "Arquivo importado por você"
        : modelLabel(asset.step?.model ?? null),
      prompt: promptOf(asset.step?.input),
      actualCost: asset.storageKey ? 0 : cost(asset.step?.actualCostBrl),
      estimatedCost: cost(asset.step?.estimatedCostBrl),
    })),
  };
}

export type LibraryAsset = Awaited<
  ReturnType<typeof loadLibrary>
>["assets"][number];
