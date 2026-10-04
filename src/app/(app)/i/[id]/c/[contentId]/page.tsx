import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, stepStatus } from "@/components/ui/badge";
import { CostChip } from "@/components/ui/cost-chip";
import { Alert } from "@/components/ui/alert";
import { sceneQuote } from "@/lib/content-generation";
import { getBalanceBrl } from "@/lib/ledger";
import { formatBrlValue } from "@/lib/money";
import { estimateReel } from "@/lib/content-plan";
import { PIPELINE } from "@/lib/pipeline";
import { providerConfigured } from "@/lib/provider";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { videoQuote } from "@/lib/video-chain";
import type { VideoChain } from "@/lib/video-chain";
import { KitForm } from "../../personagem/kit-form";
import { KitWatcher } from "../../personagem/kit-watcher";
import { assembleVideo, generateScene, generateVideo } from "./actions";
import { FlowCanvas } from "./flow-canvas";
import { ArchiveControl } from "../../../../conteudos/archive-control";
import { BriefForm } from "./brief-form";
import { ScriptForm } from "./script-form";
import { ReviewForm } from "./review-form";
import { DownloadAsset } from "@/app/(app)/biblioteca/library-view";
import { contentStatusLabels } from "@/lib/platform";
import { SceneForm } from "./scene-form";

export const dynamic = "force-dynamic";

export default async function ContentPage({
  params,
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
  params: Promise<{ id: string; contentId: string }>;
}) {
  const userId = await requireUserId();
  const { id, contentId } = await params;
  const content = await prisma.content.findFirst({
    where: { id: contentId, influencerId: id, influencer: { userId } },
    include: {
      steps: { orderBy: { position: "asc" }, include: { assets: true } },
      influencer: { select: { name: true } },
    },
  });
  if (!content) notFound();

  if (content.archivedAt)
    return (
      <div className="mx-auto grid max-w-2xl gap-5">
        <Link
          href="/conteudos?archive=1"
          className="text-body-sm text-lab-text-dim"
        >
          ← Arquivados
        </Link>
        <h1 className="break-words font-display text-h1">{content.title}</h1>
        <p className="text-lab-text-dim">
          Conteúdo arquivado. Suas mídias e o histórico foram preservados.
          Restaure para continuar a produção.
        </p>
        <ArchiveControl id={contentId} archived />
        <Link
          href={`/biblioteca?influencer=${id}`}
          className="text-body-sm underline"
        >
          Ver mídias do personagem
        </Link>
      </div>
    );

  const requestedView = (await searchParams).view;
  const preferences = requestedView
    ? null
    : await prisma.user.findUnique({
        where: { id: userId },
        select: { defaultContentView: true },
      });
  const canvasView =
    (requestedView ?? preferences?.defaultContentView) === "canvas";
  const { steps } = content;
  const script =
    (
      steps.find((step) => step.kind === "SCRIPT")?.input as
        | { script?: string }
        | undefined
    )?.script ?? "";
  const unknownCost = steps.some(
    (step) =>
      ["submission_unknown", "cost_unknown"].includes(step.submissionState) ||
      (["DONE", "APPROVED"].includes(step.status) &&
        step.actualCostBrl === null),
  );
  const total = (
    pick: (step: (typeof steps)[number]) => { toString(): string } | null,
  ) =>
    steps.reduce((sum, step) => sum + Number(pick(step)?.toString() ?? 0), 0);
  const reel = estimateReel();
  const estimated = reel.totalBrl;
  const spent = total((step) => step.actualCostBrl);
  const price = sceneQuote().totalBrl;
  const [balance, front] = await Promise.all([
    getBalanceBrl(userId),
    prisma.asset.findFirst({
      where: {
        userId,
        influencerId: id,
        role: "FRONT",
        step: { status: { in: ["DONE", "APPROVED"] } },
      },
      select: { id: true },
    }),
  ]);
  const configured = providerConfigured();
  const blockedReason = !configured
    ? "A geração ainda precisa ser configurada pela equipe."
    : !front
      ? "Gere o retrato de frente na aba Personagem antes de criar a cena."
      : balance + 1e-9 < price
        ? `Saldo insuficiente: você tem ${formatBrlValue(balance)} e precisa de ${formatBrlValue(price)}.`
        : undefined;
  const videoPrice = videoQuote().totalBrl;
  const sceneReady = steps.some(
    (step) =>
      step.kind === "IMAGE" && step.status === "DONE" && step.assets.length > 0,
  );
  const videoReady = steps.some(
    (step) =>
      step.kind === "VIDEO" &&
      step.status === "DONE" &&
      step.assets.length === 3,
  );
  const videoBlocked = !configured
    ? "A geração ainda precisa ser configurada pela equipe."
    : !sceneReady
      ? "Disponível depois que a imagem da cena estiver pronta."
      : balance + 1e-9 < videoPrice
        ? `Saldo insuficiente: você tem ${formatBrlValue(balance)} e precisa de ${formatBrlValue(videoPrice)}.`
        : undefined;

  return (
    <div className="grid gap-6">
      <div className="flex justify-end">
        <ArchiveControl id={contentId} archived={false} />
      </div>
      <KitWatcher
        influencerId={id}
        active={steps.some((step) => step.status === "RUNNING")}
      />
      <div>
        <Link
          href={`/i/${id}`}
          className="text-body-sm text-lab-text-dim hover:text-lab-text"
        >
          ← {content.influencer.name}
        </Link>
        <h1 className="mt-2 font-display text-h1">{content.title}</h1>
        <BriefForm
          influencerId={id}
          contentId={contentId}
          title={content.title}
          idea={content.idea}
          running={steps.some((step) => step.status === "RUNNING")}
        />
        {content.idea ? (
          <p className="mt-1.5 max-w-form text-body-sm text-lab-text-dim">
            {content.idea}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <CostChip
            state="estimated"
            value={estimated}
            prefix="reel de 15s (sem voz)"
          />
          <CostChip
            state={unknownCost ? "unavailable" : "actual"}
            value={unknownCost ? undefined : spent}
            prefix="gasto apurado"
          />
          <span className="rounded-control bg-lab-surface-2 px-3 py-1 text-caption">
            {contentStatusLabels[content.status]}
          </span>
        </div>
      </div>
      <nav aria-label="Visualização da produção" className="flex gap-2">
        {[
          { value: "steps", label: "Etapas" },
          { value: "canvas", label: "Canvas" },
        ].map((view) => (
          <Link
            key={view.value}
            href={`/i/${id}/c/${contentId}?view=${view.value}`}
            aria-current={
              (canvasView ? "canvas" : "steps") === view.value
                ? "page"
                : undefined
            }
            className={`rounded-control border px-4 py-2 text-body-sm ${canvasView === (view.value === "canvas") ? "border-lab-border-strong bg-lab-surface-2" : "border-lab-border text-lab-text-dim"}`}
          >
            {view.label}
          </Link>
        ))}
      </nav>
      {canvasView ? (
        <FlowCanvas
          contentId={contentId}
          steps={steps.map((step) => ({
            id: step.id,
            kind: step.kind,
            title:
              PIPELINE.find((item) => item.kind === step.kind)?.title ??
              "Etapa",
            status: step.status,
            assets: step.assets.length,
            actualCost:
              step.actualCostBrl === null ? null : Number(step.actualCostBrl),
            estimatedCost:
              step.estimatedCostBrl === null
                ? (reel.perStep[step.kind] ?? null)
                : Number(step.estimatedCostBrl),
          }))}
        />
      ) : null}
      <ol className="grid gap-3">
        {steps.map((step, index) => {
          const info = PIPELINE.find((item) => item.kind === step.kind)!;
          const [variant, label] = stepStatus[step.status];
          return (
            <li
              id={`step-${step.id}`}
              key={step.id}
              className="scroll-mt-20 flex flex-wrap items-start gap-3 rounded-lab border border-lab-border bg-lab-surface-1 p-4 sm:gap-4 sm:p-5"
            >
              <span
                className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-caption text-lab-on-reagent ${info.accent}`}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1 basis-40">
                <p className="font-display text-h3">{info.title}</p>
                <p className="mt-0.5 text-body-sm text-lab-text-dim">
                  {info.description}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Badge variant={variant} dot>
                  {label}
                </Badge>
                {(() => {
                  const planned = reel.perStep[step.kind];
                  if (step.actualCostBrl)
                    return (
                      <CostChip
                        size="sm"
                        state="actual"
                        value={Number(step.actualCostBrl.toString())}
                      />
                    );
                  if (step.estimatedCostBrl)
                    return (
                      <CostChip
                        size="sm"
                        state="estimated"
                        value={Number(step.estimatedCostBrl.toString())}
                      />
                    );
                  if (planned === 0)
                    return <CostChip size="sm" state="free" value={0} />;
                  return (
                    <CostChip
                      size="sm"
                      state={planned == null ? "pending" : "estimated"}
                      value={planned ?? undefined}
                    />
                  );
                })()}
              </div>
              {step.kind === "SCRIPT" ? (
                <div className="w-full">
                  <ScriptForm
                    influencerId={id}
                    contentId={contentId}
                    script={script}
                  />
                </div>
              ) : null}
              {step.kind === "IMAGE" ? (
                <div className="w-full min-w-0">
                  {step.status === "PENDING" || step.status === "QUOTED" ? (
                    <SceneForm
                      action={generateScene.bind(null, id, contentId)}
                      intent={randomUUID()}
                      expectedBrl={price}
                      prompt={script || content.idea || content.title}
                      blockedReason={blockedReason}
                    />
                  ) : null}
                  {step.status === "RUNNING" ? (
                    <p
                      role="status"
                      className="mt-3 text-body-sm text-lab-text-dim"
                    >
                      Gerando imagem… O custo está reservado.
                    </p>
                  ) : null}
                  {step.status === "FAILED" ? (
                    <Alert variant="error" title="Esta geração falhou">
                      {["submission_unknown", "cost_unknown"].includes(
                        step.submissionState,
                      )
                        ? "O custo ainda precisa de conferência. Nada será reenviado automaticamente."
                        : "A geração não foi concluída. Confira o saldo e tente outra produção enquanto verificamos a falha."}
                    </Alert>
                  ) : null}
                  {step.assets.map((asset) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={asset.id}
                      src={asset.url}
                      alt="Imagem da cena com o influencer"
                      className="mt-4 max-h-[32rem] max-w-full rounded-control border border-lab-border object-contain"
                    />
                  ))}
                </div>
              ) : null}
              {step.kind === "VIDEO" ? (
                <div className="w-full min-w-0">
                  {step.status === "PENDING" || step.status === "QUOTED" ? (
                    <SceneForm
                      action={generateVideo.bind(null, id, contentId)}
                      intent={randomUUID()}
                      expectedBrl={videoPrice}
                      prompt={script || content.idea || content.title}
                      blockedReason={videoBlocked}
                      fieldLabel="Movimento"
                      label="Aprovar custo e gerar 3 clipes"
                      description="Três blocos de 5s. Cada continuação começa no último quadro do clipe anterior."
                    />
                  ) : null}
                  {step.status === "RUNNING" ? (
                    <p role="status" className="text-body-sm text-lab-text-dim">
                      Gerando vídeo…{" "}
                      {(step.input as { chain?: VideoChain }).chain?.clips
                        .length ?? 0}{" "}
                      de 3 clipes verificados. O custo total está reservado.
                    </p>
                  ) : null}
                </div>
              ) : null}
              {step.kind === "ASSEMBLY" &&
              (step.status === "PENDING" || step.status === "QUOTED") ? (
                <div className="w-full">
                  <KitForm
                    action={assembleVideo.bind(null, id, contentId)}
                    intent={randomUUID()}
                    expectedBrl={0}
                    label="Montar vídeo final"
                    blockedReason={
                      !configured
                        ? "A geração ainda precisa ser configurada pela equipe."
                        : videoReady
                          ? undefined
                          : "Disponível depois dos três clipes."
                    }
                  />
                </div>
              ) : null}
              {step.kind !== "IMAGE" && step.status === "FAILED" ? (
                <div className="w-full">
                  <Alert variant="error" title="Esta etapa falhou">
                    {["submission_unknown", "cost_unknown"].includes(
                      step.submissionState,
                    )
                      ? "O custo ainda precisa de conferência. Nada será reenviado automaticamente."
                      : "A geração não foi concluída. Confira o saldo e tente outra produção enquanto verificamos a falha."}
                  </Alert>
                </div>
              ) : null}
              {step.assets
                .filter((asset) => asset.kind === "VIDEO")
                .sort((a, b) => {
                  const clips =
                    (step.input as { chain?: VideoChain }).chain?.clips ?? [];
                  return (
                    clips.findIndex((clip) => clip.url === a.url) -
                    clips.findIndex((clip) => clip.url === b.url)
                  );
                })
                .map((asset, clipIndex) => (
                  <figure key={asset.id} className="grid w-full max-w-xs gap-2">
                    <video
                      controls
                      preload="metadata"
                      src={asset.url}
                      className="max-h-[28rem] w-full rounded-control border border-lab-border"
                    />
                    <DownloadAsset id={asset.id} />
                    <figcaption className="text-caption text-lab-text-dim">
                      {step.kind === "ASSEMBLY"
                        ? "Vídeo final"
                        : `Clipe ${clipIndex + 1} · ${asset.durationSec?.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}s`}
                    </figcaption>
                  </figure>
                ))}
            </li>
          );
        })}
      </ol>
      {steps.some(
        (step) =>
          step.kind === "ASSEMBLY" &&
          step.status === "DONE" &&
          step.assets.some((asset) => asset.kind === "VIDEO"),
      ) ? (
        <section className="rounded-lab border border-lab-border bg-lab-surface-1 p-5">
          <ReviewForm
            influencerId={id}
            contentId={contentId}
            status={content.status}
          />
        </section>
      ) : null}
    </div>
  );
}
