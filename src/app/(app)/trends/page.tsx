import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/app/page-heading";
import { buttonVariants } from "@/components/ui/button";
import { loadPromptTemplates, motionPromptKey, renderPrompt } from "@/lib/prompts";
import { requireOwner } from "@/lib/owner";
import { prisma } from "@/lib/prisma";
import {
  MOTION_MODELS,
  TRENDS,
  motionSchema,
  motionEstimate,
  type MotionBrief,
} from "@/lib/motion";
import {
  referenceStorageReady,
  localReferenceStorage,
} from "@/lib/reference-storage";
import { UploadReference } from "../biblioteca/upload-reference";
import { MotionForm } from "./motion-form";
export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ trend?: string; copy?: string; edit?: string }>;
}) {
  const userId = await requireOwner(); // 404 for everyone who is not an owner
  const params = await searchParams;
  let initial: MotionBrief | undefined;
  let draft: { id: string; title: string; influencerId: string } | undefined;
  if (params.copy || params.edit) {
    const source = await prisma.content.findFirst({
      where: { id: params.edit ?? params.copy, influencer: { userId }, ...(params.edit ? { archivedAt: null, steps: { every: { status: { in: ["PENDING", "QUOTED"] }, operationKey: null, submissionState: "not_submitted" } } } : {}) },
      select: { id: true, title: true, influencerId: true, motion: true },
    });
    const parsed = motionSchema.safeParse(source?.motion);
    if (!parsed.success) notFound();
    initial = parsed.data;
    if (params.edit && source) draft = { id: source.id, title: source.title, influencerId: source.influencerId };
  }
  // The starting text of each model can be replaced by an admin (admin > Prompts).
  const templates = await loadPromptTemplates();
  const modelPrompts = Object.fromEntries(MOTION_MODELS.map((model) => [model.id, renderPrompt(motionPromptKey(model.id), {}, templates)]));
  const selected = TRENDS.find(
    (t) => t.id === (initial?.trend ?? params.trend),
  );
  if (params.trend && !selected) notFound();
  const [characters, assets] = await Promise.all([
    prisma.influencer.findMany({
      where: { userId },
      select: { id: true, name: true, faceAssetId: true },
      orderBy: { name: "asc" },
    }),
    prisma.asset.findMany({
      where: {
        userId,
        OR: [
          { storageKey: { not: null } },
          { kind: "IMAGE", step: { status: { in: ["DONE", "APPROVED"] } } },
        ],
      },
      include: { influencer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const media = assets.map((a) => ({
    id: a.id,
    url: a.url,
    name:
      a.fileName ??
      `${a.influencer?.name ?? "Personagem"} · ${a.role ?? "Imagem"}`,
    durationSec: a.durationSec,
    width: a.width,
    height: a.height,
  }));
  // The character sheet is a grid of faces and confuses a motion model: offer single portraits only, front portrait first.
  const images = media
    .filter((a) => {
      const asset = assets.find((x) => x.id === a.id);
      return asset?.kind === "IMAGE" && asset.role !== "SHEET";
    })
    .sort((a, b) => Number(assets.find((x) => x.id === b.id)?.role === "FRONT") - Number(assets.find((x) => x.id === a.id)?.role === "FRONT"));
  const videos = media.filter(
    (a) => assets.find((x) => x.id === a.id)?.kind === "VIDEO",
  );
  return (
    <div className="mx-auto max-w-content">
      <PageHeading
        title={selected ? selected.name : "Uma trend, seus personagens"}
        description={
          selected
            ? selected.description
            : "Escolha uma estrutura, importe seu vídeo e recrie o movimento com as suas referências."
        }
        action={
          selected ? (
            <Link
              href="/trends"
              className={buttonVariants({ variant: "secondary" })}
            >
              Todas as estruturas
            </Link>
          ) : undefined
        }
      />
      {!selected ? (
        <>
          <div className="mb-8 grid gap-5 lg:grid-cols-3">
            {TRENDS.map((trend, index) => (
              <article
                key={trend.id}
                className="overflow-hidden rounded-lab border border-lab-border bg-lab-surface-1"
              >
                <div
                  className="relative flex h-48 items-end justify-center gap-3 overflow-hidden bg-gradient-to-br from-lab-reagent/20 via-lab-surface-2 to-lab-bg p-6"
                  aria-hidden="true"
                >
                  {Array.from({ length: index === 1 ? 1 : 3 }, (_, i) => (
                    <div
                      key={i}
                      className={`w-14 rounded-t-full border border-lab-reagent/40 bg-lab-reagent/20 ${i === 1 ? "h-32" : "h-24"}`}
                    />
                  ))}
                  <span className="absolute left-4 top-4 rounded-full bg-lab-bg/80 px-3 py-1 font-mono text-xs">
                    {index === 1 ? "1 PERSONAGEM" : "ATÉ 3 REFERÊNCIAS"}
                  </span>
                </div>
                <div className="grid gap-4 p-5">
                  <h2 className="font-display text-xl">{trend.name}</h2>
                  <p className="min-h-20 text-body-sm leading-6 text-lab-text-dim">
                    {trend.description}
                  </p>
                  <Link
                    href={`/trends?trend=${trend.id}`}
                    className={buttonVariants({ size: "lg" })}
                  >
                    Preparar recriação
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <p className="mb-6 text-body-sm text-lab-text-muted">
            Traga seu vídeo de referência. O catálogo organiza as recriações;
            não inclui os vídeos de terceiros usados nas trends.
          </p>
          <UploadReference
            ready={referenceStorageReady()}
            local={localReferenceStorage()}
          />
        </>
      ) : (
        <>
          {!characters.length && (
            <p className="mb-5 text-body-sm">
              Crie um personagem para organizar esta produção.{" "}
              <Link href="/influenciadores/nova" className="underline">
                Criar personagem
              </Link>{" "}
              ou{" "}
              <Link href="/influenciadores/importar" className="underline">
                importar um que você já tem
              </Link>
            </p>
          )}
          <MotionForm
            key={selected.id + (params.edit ?? params.copy ?? "")}
            trend={selected}
            modelPrompts={modelPrompts}
            characters={characters}
            images={images}
            videos={videos}
            uploadReady={referenceStorageReady()}
            initial={initial}
            draft={draft}
            rate={motionEstimate(4, "720p").rate}
          />
        </>
      )}
    </div>
  );
}
