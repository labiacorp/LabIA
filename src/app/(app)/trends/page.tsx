import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/app/page-heading";
import { buttonVariants } from "@/components/ui/button";
import { loadPromptTemplates, renderPrompt } from "@/lib/prompts";
import { requireUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
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
  searchParams: Promise<{ trend?: string; copy?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  let initial: MotionBrief | undefined;
  if (params.copy) {
    const source = await prisma.content.findFirst({
      where: { id: params.copy, influencer: { userId } },
      select: { motion: true },
    });
    const parsed = motionSchema.safeParse(source?.motion);
    if (!parsed.success) notFound();
    initial = parsed.data;
  }
  // The starting text of each trend can be replaced by an admin (admin > Prompts).
  const templates = await loadPromptTemplates();
  const trends = TRENDS.map((trend) => ({ ...trend, prompt: renderPrompt(`trend-${trend.id}`, {}, templates) }));
  const selected = trends.find(
    (t) => t.id === (initial?.trend ?? params.trend),
  );
  if (params.trend && !selected) notFound();
  const [characters, assets] = await Promise.all([
    prisma.influencer.findMany({
      where: { userId },
      select: { id: true, name: true },
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
  }));
  const images = media.filter(
    (a) => assets.find((x) => x.id === a.id)?.kind === "IMAGE",
  );
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
          <UploadReference
            ready={referenceStorageReady()}
            local={localReferenceStorage()}
          />
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
            key={selected.id + (params.copy ?? "")}
            trend={selected}
            characters={characters}
            images={images}
            videos={videos}
            initial={initial}
            rate={motionEstimate(4, "720p").rate}
          />
        </>
      )}
    </div>
  );
}
