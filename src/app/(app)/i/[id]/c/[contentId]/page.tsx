import { MotionProduction } from "@/app/(app)/trends/motion-production";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleAlert, Clapperboard, FileText, Image as ImageIcon, Scissors, type LucideIcon } from "lucide-react";

import { CostChip } from "@/components/ui/cost-chip";
import { getImageOptions } from "@/lib/content-generation";
import { getBalanceBrl } from "@/lib/ledger";
import { estimateReel } from "@/lib/content-plan";
import { providerConfigured } from "@/lib/provider";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { getVideoOptions } from "@/lib/video-options";
import type { VideoChain } from "@/lib/video-chain";
import { chargeBrl, costCredits, costText, creditsText } from "@/lib/plan";
import { AdminPrompt } from "@/components/app/admin-prompt";
import { isOwner } from "@/lib/owner";
import { KitWatcher } from "../../personagem/kit-watcher";
import { ArchiveControl } from "../../../../conteudos/archive-control";
import { DownloadAsset } from "@/app/(app)/biblioteca/library-view";
import { PublishButton } from "@/components/app/publish-dialog";
import { assembleVideo, generateScene, generateVideo } from "./actions";
import { ScriptForm } from "./script-form";
import { SceneForm } from "./scene-form";
import { VideoForm } from "./video-form";
import { StepToast } from "./step-toast";
import { ApproveButton, AssembleButton, DeleteContentButton } from "./stage-actions";

export const dynamic = "force-dynamic";

// Conteúdo e etapas, from the design (LabIA App.dc.html): finished stages collapse to a row, only the current one
// is open, later ones wait with their estimate. A paid take ends "Pronto" and opens the next stage once approved.
const STAGE: Record<string, { name: string; icon: LucideIcon; done: string; noun: string }> = {
  SCRIPT: { name: "Roteiro", icon: FileText, done: "Pronta", noun: "o roteiro" },
  IMAGE: { name: "Imagem", icon: ImageIcon, done: "Aprovada", noun: "a imagem" },
  VIDEO: { name: "Vídeo", icon: Clapperboard, done: "Aprovado", noun: "o vídeo" },
  ASSEMBLY: { name: "Montagem", icon: Scissors, done: "Aprovada", noun: "a montagem" },
};
const unsettled = (state: string) => state === "submission_unknown" || state === "cost_unknown";
// Toasts only for takes that just finished; StepToast also shows each one once per session.
const recent = (date: Date | null) => !!date && Date.now() - date.getTime() < 10 * 60_000;

export default async function ContentPage({ params }: { params: Promise<{ id: string; contentId: string }> }) {
  const userId = await requireUserId();
  const { id, contentId } = await params;
  const content = await prisma.content.findFirst({
    where: { id: contentId, influencerId: id, influencer: { userId } },
    include: { steps: { orderBy: { position: "asc" }, include: { assets: { orderBy: { createdAt: "desc" } } } }, influencer: { select: { name: true, faceAssetId: true } } },
  });
  if (!content) notFound();

  if (content.archivedAt)
    return <div className="mx-auto grid max-w-2xl gap-5">
      <Link href="/conteudos" className="text-body-sm text-lab-text-dim">← Conteúdos</Link>
      <h1 className="break-words font-display text-[30px] font-black uppercase leading-[.9]">{content.title}</h1>
      <p className="text-lab-text-dim">Conteúdo arquivado. Suas mídias e o histórico foram preservados. Restaure para continuar.</p>
      <ArchiveControl id={contentId} archived />
    </div>;

  if (content.motion) return <MotionProduction userId={userId} contentId={contentId} />;

  const steps = content.steps.filter((step) => STAGE[step.kind]);
  const script = (steps.find((step) => step.kind === "SCRIPT")?.input as { script?: string } | undefined)?.script ?? "";
  const reel = estimateReel();
  const unknownCost = steps.some((step) => unsettled(step.submissionState) || (["DONE", "APPROVED"].includes(step.status) && step.actualCostBrl === null));
  const spent = steps.reduce((sum, step) => sum + chargeBrl(Number(step.actualCostBrl ?? 0)), 0);
  const planned = steps.reduce((sum, step) => sum + Number(step.actualCostBrl ?? step.estimatedCostBrl ?? reel.perStep[step.kind] ?? 0), 0);
  const [balance, front, admin] = await Promise.all([
    getBalanceBrl(userId),
    prisma.asset.findFirst({ where: { userId, id: content.influencer.faceAssetId ?? "", influencerId: id, role: "FRONT", step: { status: { in: ["DONE", "APPROVED"] } } }, select: { id: true } }),
    isOwner(),
  ]);
  const configured = providerConfigured();
  const complete = (step: (typeof steps)[number]) => step.status === "APPROVED" || (step.kind === "SCRIPT" && step.status === "DONE");
  const activeIndex = steps.findIndex((step) => !complete(step));
  const active = activeIndex === -1 ? null : steps[activeIndex];
  const running = steps.some((step) => step.status === "RUNNING");
  const prompt = script || content.idea || content.title;

  // Latest media for the 9:16 preview: the final cut, then the video, then the scene image.
  const media = (kind: string) => steps.find((step) => step.kind === kind)?.assets.find((asset) => asset.kind === (kind === "IMAGE" ? "IMAGE" : "VIDEO"));
  const finalCut = media("ASSEMBLY");
  const shown = finalCut ?? media("VIDEO") ?? media("IMAGE");
  const previewLabel = active?.status === "RUNNING" ? `gerando ${STAGE[active.kind].noun}` : finalCut ? `vídeo final · ${finalCut.durationSec ? Math.round(finalCut.durationSec) : 15}s` : shown?.kind === "VIDEO" ? "vídeo · aguardando montagem" : shown ? "imagem · aguardando vídeo" : "nada gerado ainda";
  const preview = (cls: string) => <div className={`relative aspect-[9/16] w-full overflow-hidden rounded-card bg-[repeating-linear-gradient(135deg,var(--lab-surface-1)_0_12px,var(--lab-surface-2)_12px_24px)] shadow-[inset_0_0_0_1px_var(--lab-border)] ${cls}`}>
    {shown?.kind === "VIDEO" ? <video controls preload="metadata" src={shown.url} className="absolute inset-0 size-full object-cover" />
      // eslint-disable-next-line @next/next/no-img-element
      : shown ? <img src={shown.url} alt="" className="absolute inset-0 size-full object-cover" /> : null}
    {active?.status === "RUNNING" ? <div className="absolute inset-x-0 bottom-0 h-[62%] bg-lab-reagent/10" /> : null}
    {!shown ? <span className="absolute left-3 top-3 flex items-center gap-1.5 font-mono text-caption"><span className="size-[7px] rounded-full bg-lab-reagent" />00:00</span> : null}
    {shown?.kind !== "VIDEO" ? <span className="absolute bottom-3 left-3 font-mono text-caption text-lab-text-dim">{previewLabel}</span> : null}
  </div>;

  const estimate = (step: (typeof steps)[number]) => {
    const value = step.estimatedCostBrl === null ? reel.perStep[step.kind] : Number(step.estimatedCostBrl);
    return value === undefined || value === null ? null : value;
  };
  const chip = (step: (typeof steps)[number]) => {
    if (step.actualCostBrl !== null && ["DONE", "APPROVED"].includes(step.status)) return Number(step.actualCostBrl) > 0 ? <CostChip size="sm" state="actual" value={Number(step.actualCostBrl)} /> : <CostChip size="sm" state="free" value={0} />;
    const value = estimate(step);
    return value === null ? <CostChip size="sm" state="pending" /> : value === 0 ? <CostChip size="sm" state="free" value={0} /> : <CostChip size="sm" state="estimated" value={value} />;
  };
  const row = (step: (typeof steps)[number], index: number, before: boolean) => {
    const stage = STAGE[step.kind];
    const previous = steps[index - 1];
    const status = before ? stage.done : estimate(step) === 0 ? "Sem custo" : previous ? `Espera ${STAGE[previous.kind].noun}` : "Próxima";
    return <div key={step.id} className="flex min-h-14 items-center gap-3 border-b border-lab-border">
      <span className="w-[18px] font-mono text-[11px] text-lab-text-disabled">{String(index + 1).padStart(2, "0")}</span>
      <stage.icon className="size-[18px] text-lab-text-dim" aria-hidden />
      <span className={`flex-1 text-[15px] font-medium ${before ? "" : "text-lab-text-dim"}`}>{stage.name}</span>
      <span className="text-caption text-lab-text-dim">{status}</span>
      {chip(step)}
    </div>;
  };

  const imageBlocked = !configured ? "A geração ainda precisa ser configurada pela equipe." : !front ? "Crie o rosto da influencer antes de gerar a cena." : undefined;
  const sceneAsset = media("IMAGE");
  const form = (step: (typeof steps)[number], label?: string) => step.kind === "IMAGE"
    ? <SceneForm action={generateScene.bind(null, id, contentId)} intent={randomUUID()} options={getImageOptions(content.aspectRatio)} balanceBrl={balance} prompt={prompt} blockedReason={imageBlocked} label={label} />
    : step.kind === "VIDEO"
      ? <VideoForm action={generateVideo.bind(null, id, contentId)} intent={randomUUID()} balanceBrl={balance} options={getVideoOptions(sceneAsset ? { width: sceneAsset.width, height: sceneAsset.height } : undefined)} prompt={prompt} blockedReason={!configured ? "A geração ainda precisa ser configurada pela equipe." : undefined} label={label} />
      : null;

  const card = (step: (typeof steps)[number], index: number) => {
    const stage = STAGE[step.kind];
    const paid = step.kind === "IMAGE" || step.kind === "VIDEO";
    const reserved = Number(step.estimatedCostBrl ?? 0);
    const actual = step.actualCostBrl === null ? null : Number(step.actualCostBrl);
    const failedUnknown = step.status === "FAILED" && unsettled(step.submissionState);
    const [status, tone] = step.status === "RUNNING" ? ["Gerando", "text-lab-info"]
      : step.status === "DONE" ? ["Pronto", "text-lab-text"]
      : step.status === "FAILED" ? [failedUnknown ? "Falhou · em conferência" : "Falhou · estornado", "text-lab-danger"]
      : paid ? ["Aprovar custo", "text-lab-warning"] : step.kind === "SCRIPT" ? ["Grátis", "text-lab-text-dim"] : ["Sem custo", "text-lab-text-dim"];
    const ring = step.status === "FAILED" ? "var(--lab-danger)" : paid && (step.status === "PENDING" || step.status === "QUOTED") ? "var(--lab-reagent)" : "var(--lab-border-strong)";
    const chain = (step.input as { chain?: VideoChain } | null)?.chain;
    const blocks = chain?.recipe?.blocks ?? (chain ? 3 : 1);
    const toastKey = `${step.id}:${step.completedAt?.getTime() ?? 0}`;
    return <section key={step.id} className="flex flex-col gap-3.5 rounded-card bg-lab-surface-1 p-4" style={{ boxShadow: `inset 0 0 0 1.5px ${ring}` }}>
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-[11px] text-lab-text-disabled">{String(index + 1).padStart(2, "0")}</span>
        <h2 className="font-display text-[28px] font-black uppercase leading-none">{stage.name}</h2>
        <span className={`ml-auto flex items-center gap-1.5 text-caption ${tone}`}><span className="size-1.5 rounded-full bg-current" />{status}</span>
      </div>

      {admin && step.status !== "PENDING" && step.status !== "QUOTED" ? <AdminPrompt prompt={(step.input as { prompt?: unknown } | null)?.prompt} model={step.model} /> : null}

      {step.kind === "SCRIPT" ? <ScriptForm influencerId={id} contentId={contentId} script={script} /> : null}

      {paid && (step.status === "PENDING" || step.status === "QUOTED") ? form(step) : null}

      {step.status === "RUNNING" ? <>
        <div className="flex gap-1">{Array.from({ length: blocks }, (_, block) => <span key={block} className={`h-2 flex-1 rounded ${block < (chain?.clips.length ?? 0) ? "bg-lab-reagent" : block === (chain?.clips.length ?? 0) ? "animate-lab-shimmer bg-[linear-gradient(90deg,var(--lab-reagent),var(--lab-surface-3))] bg-[length:200%_100%]" : "bg-lab-surface-3"}`} />)}</div>
        <div className="flex flex-wrap items-center justify-between gap-2.5 font-mono text-[13px]">
          <span className="text-lab-text-dim">{blocks > 1 ? `clipe ${Math.min((chain?.clips.length ?? 0) + 1, blocks)} de ${blocks}` : "leva cerca de 1 min"}</span>
          {reserved > 0 ? <span className="flex h-[30px] items-center gap-[7px] rounded-full bg-lab-surface-2 px-[11px]"><span className="size-[7px] animate-pulse rounded-full bg-lab-reagent" />{costText(reserved)} reservados</span> : null}
        </div>
      </> : null}

      {step.status === "DONE" ? <>
        {recent(step.completedAt) && actual !== null && paid ? <StepToast id={toastKey} tone="money" title={`${stage.name} pront${step.kind === "IMAGE" ? "a" : "o"}`}>Saiu por {costText(actual)}{costCredits(reserved) > costCredits(actual) ? `, ${creditsText(costCredits(reserved) - costCredits(actual))} abaixo do previsto` : ""}.</StepToast> : null}
        <div className="lg:hidden">{step.assets[0]?.kind === "VIDEO" ? <video controls preload="metadata" src={step.assets[0].url} className="max-h-[28rem] w-full rounded-control" />
          // eslint-disable-next-line @next/next/no-img-element
          : step.assets[0] ? <img src={step.assets[0].url} alt="" className="max-h-[28rem] w-full rounded-control object-contain" /> : null}</div>
        {paid ? <div className="flex flex-wrap items-center justify-between gap-2.5">
          <span className="text-[13px] text-lab-text-dim">{actual === null ? "custo real em conferência" : `previsto ~${costText(reserved)}${costCredits(reserved) > costCredits(actual) ? ` · ${creditsText(costCredits(reserved) - costCredits(actual))} voltaram` : ""}`}</span>
          {actual === null ? <CostChip state="unavailable" /> : <CostChip size="lg" state="actual" value={actual} />}
        </div> : null}
        <div className="flex flex-wrap gap-2">
          <ApproveButton influencerId={id} contentId={contentId} stepId={step.id} label={step.kind === "ASSEMBLY" ? "Aprovar vídeo" : `Aprovar ${stage.name.toLowerCase()}`} />
          {step.kind === "ASSEMBLY" && finalCut ? <><DownloadAsset id={finalCut.id} /><PublishButton assetId={finalCut.id} contentId={content.id} /></> : null}
        </div>
        {paid && step.submissionState === "completed" ? <details className="group">
          <summary className="flex h-12 cursor-pointer list-none items-center justify-center gap-2 rounded-full border-[1.5px] border-lab-border-strong text-body-sm font-semibold">Refazer {estimate(step) ? <span className="flex h-[34px] items-center rounded-full border-[1.5px] border-lab-reagent px-2.5 font-mono text-[13px] text-lab-reagent-bright">~{costText(estimate(step)!)}</span> : null}</summary>
          <div className="mt-3.5">{form(step, "Refazer")}</div>
        </details> : null}
      </> : null}

      {step.status === "FAILED" ? <>
        {!failedUnknown && recent(step.completedAt) ? <StepToast id={toastKey} tone="error" title={`${stage.name} falhou`}>Os {costText(reserved)} reservados voltaram pro seu saldo.</StepToast> : null}
        <div className="flex items-start gap-2.5 text-body-sm leading-[1.5]"><CircleAlert className="mt-px size-[18px] shrink-0 text-lab-danger" aria-hidden />
          <span>{failedUnknown ? "Não conseguimos confirmar o resultado. O valor ficou reservado para conferência e nada será reenviado sozinho." : <>A geração não deu certo. Os <span className="font-mono">{costText(reserved)}</span> reservados voltaram pro seu saldo.</>}</span></div>
        {!failedUnknown ? <>
          <div className="flex items-center gap-2.5"><span className="flex h-7 items-center rounded-full border-[1.5px] border-lab-border-strong px-2.5 font-mono text-caption text-lab-text-dim line-through">{costText(reserved)}</span><span className="text-[13px] text-lab-text-dim">estornado</span></div>
          {form(step, "Tentar de novo")}
        </> : null}
      </> : null}

      {step.kind === "ASSEMBLY" && (step.status === "PENDING" || step.status === "QUOTED") ? <AssembleButton action={assembleVideo.bind(null, id, contentId)} intent={randomUUID()} blockedReason={!configured ? "A geração ainda precisa ser configurada pela equipe." : undefined} /> : null}
    </section>;
  };

  return <div className="grid items-start gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
    <KitWatcher influencerId={id} active={running} />
    <div className="sticky top-24 hidden flex-col gap-3 lg:flex">{preview("")}{finalCut ? <><DownloadAsset id={finalCut.id} /><PublishButton assetId={finalCut.id} contentId={content.id} /></> : null}</div>
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link href="/conteudos" aria-label="Voltar para conteúdos" className="flex size-11 items-center justify-center rounded-full bg-lab-surface-2 focus-visible:outline-none focus-visible:shadow-lab-focus"><ArrowLeft className="size-[19px]" aria-hidden /></Link>
        <span className="text-body-sm text-lab-text-dim">{content.influencer.name} · {content.aspectRatio}</span>
        <DeleteContentButton influencerId={id} contentId={contentId} stages={steps.length} spent={unknownCost ? "créditos" : costText(spent)} running={running} />
      </div>
      <h1 className="break-words font-display text-[30px] font-black uppercase leading-[.9] lg:text-[40px]">{content.title}</h1>
      {!active && finalCut ? <div className="lg:hidden">{preview("")}</div> : null}
      <div className="grid grid-cols-2 border-y border-lab-border">
        <div className="flex flex-col gap-0.5 py-3"><span className="font-mono text-[11px] text-lab-text-dim">gasto ✓</span><span className="font-mono text-[22px]">{unknownCost ? "indisponível" : costText(spent)}</span></div>
        <div className="flex flex-col gap-0.5 border-l border-lab-border py-3 pl-3.5"><span className="font-mono text-[11px] text-lab-text-dim">total previsto</span><span className="font-mono text-[22px] text-lab-reagent-bright">~{costText(planned)}</span></div>
      </div>
      <div className="flex flex-col">{steps.slice(0, activeIndex === -1 ? steps.length : activeIndex).map((step, index) => row(step, index, true))}</div>
      {active ? card(active, activeIndex) : null}
      {active ? <div className="flex flex-col">{steps.slice(activeIndex + 1).map((step, offset) => row(step, activeIndex + 1 + offset, false))}</div> : null}
    </div>
  </div>;
}
