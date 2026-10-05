import { randomUUID } from "node:crypto";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { motionSchema, motionEstimate, MOTION_MODEL } from "@/lib/motion";
import { providerConfigured, mockEnabled } from "@/lib/provider";
import { KitForm } from "../i/[id]/personagem/kit-form";
import { KitWatcher } from "../i/[id]/personagem/kit-watcher";
import { ReviewForm } from "../i/[id]/c/[contentId]/review-form";
import { DownloadAsset } from "../biblioteca/library-view";
import { generateMotion } from "./actions";
import { buttonVariants } from "@/components/ui/button";
import { ArchiveControl } from "../conteudos/archive-control";
export async function MotionProduction({
  userId,
  contentId,
}: {
  userId: string;
  contentId: string;
}) {
  const content = await prisma.content.findFirstOrThrow({
    where: { id: contentId, influencer: { userId } },
    include: { steps: { include: { assets: true } } },
  });
  const brief = motionSchema.parse(content.motion);
  const assets = await prisma.asset.findMany({
    where: { id: { in: [brief.sourceId, ...brief.referenceIds] }, userId },
  });
  const source = assets.find((a) => a.id === brief.sourceId);
  const step = content.steps[0];
  const output = step?.assets.find((a) => a.kind === "VIDEO");
  const estimate = source?.durationSec
    ? motionEstimate(source.durationSec, brief.resolution).brl
    : 0;
  return (
    <div className="mx-auto grid max-w-content gap-6">
      <Link href="/trends" className="text-body-sm text-lab-text-muted">
        ← Trends
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-h1">{content.title}</h1>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/trends?copy=${content.id}`}
            className={buttonVariants({ variant: "secondary" })}
          >
            Recriar com outras referências
          </Link>
          <ArchiveControl id={content.id} archived={false} />
        </div>
      </div>
      {mockEnabled() && (
        <p className="rounded-lg border border-lab-warning/30 p-4 text-body-sm text-lab-warning">
          Modo de teste: o resultado será um vídeo de exemplo, sem transferência
          real de movimento ou cobrança externa.
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="grid content-start gap-4 rounded-lab border border-lab-border bg-lab-surface-1 p-5">
          <h2 className="font-display text-xl">Referências desta produção</h2>
          {source && (
            <video
              src={source.url}
              controls
              preload="metadata"
              className="max-h-80 w-full rounded-lg bg-black"
            />
          )}
          <div className="flex flex-wrap gap-3">
            {brief.referenceIds.map((id, index) => {
              const asset = assets.find((a) => a.id === id);
              return asset ? (
                <figure key={id}>
                  <Image
                    unoptimized
                    src={asset.url}
                    width={120}
                    height={120}
                    className="h-28 w-28 rounded-lg object-cover"
                    alt={`Referência ${index + 1}`}
                  />
                  <figcaption className="mt-2 text-caption text-lab-text-muted">
                    Referência {index + 1}
                  </figcaption>
                </figure>
              ) : (
                <p key={id}>Referência indisponível</p>
              );
            })}
          </div>
          <p className="whitespace-pre-wrap text-body-sm leading-6 text-lab-text-dim">
            {brief.prompt}
          </p>
          <p className="text-caption text-lab-text-muted">
            Genjutsu Motion Transfer · {brief.resolution} ·{" "}
            {source?.durationSec?.toFixed(1)}s
          </p>
        </section>
        <section className="grid content-start gap-4 rounded-lab border border-lab-border bg-lab-surface-1 p-5">
          <h2 className="font-display text-xl">Sua recriação</h2>
          {output ? (
            <>
              <video
                src={output.url}
                controls
                preload="metadata"
                className="max-h-96 w-full rounded-lg bg-black"
              />
              <DownloadAsset id={output.id} />
              <p className="text-body-sm text-lab-text-muted">
                {step.actualCostBrl === null
                  ? "Custo final aguardando conferência. A reserva foi mantida."
                  : `Custo registrado: R$ ${Number(step.actualCostBrl).toFixed(2)}`}
              </p>
              <ReviewForm
                influencerId={content.influencerId}
                contentId={content.id}
                status={content.status}
              />
            </>
          ) : step?.status === "RUNNING" ? (
            <>
              <p role="status">
                Recriação em andamento. Você pode sair e voltar; o pedido está
                salvo.
              </p>
              <KitWatcher influencerId={content.influencerId} active />
            </>
          ) : step?.status === "FAILED" ? (
            <p role="alert" className="text-body-sm text-lab-warning">
              O resultado precisa ser conferido antes de reenviar. O pedido e a
              reserva estão preservados no histórico.
            </p>
          ) : (
            <>
              <p className="text-body-sm text-lab-text-dim">
                Confira as referências e o valor antes de confirmar. A
                estimativa usa a duração arredondada para cima.
              </p>
              <KitForm
                action={generateMotion.bind(
                  null,
                  content.influencerId,
                  content.id,
                )}
                intent={randomUUID()}
                expectedBrl={estimate}
                label={
                  mockEnabled()
                    ? "Confirmar simulação"
                    : "Confirmar e gerar vídeo"
                }
                blockedReason={
                  !providerConfigured(MOTION_MODEL)
                    ? "A integração Genjutsu e o endereço público precisam ser configurados para gerar."
                    : !source
                      ? "Importe novamente o vídeo de referência."
                      : undefined
                }
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
