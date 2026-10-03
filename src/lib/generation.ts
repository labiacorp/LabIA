import { Prisma } from "@/generated/prisma/client";
import type { AssetRole } from "@/generated/prisma/enums";
import { getProvider } from "@/lib/provider";
import { prisma } from "@/lib/prisma";
import type { GenParams, GenerationResult } from "@/lib/providers/model-provider";

// Money path shared by character-kit and content steps. Design ported from the V1 coordinator:
//  - one operationKey per intent, so a double submit never charges or sends twice;
//  - submission state: not_submitted -> submitting -> submitted | submission_unknown;
//  - an ambiguous submit is NEVER resent automatically (the reservation stays until someone reconciles).
// Unlike V1 nothing blocks waiting for fal: submit now, collect later (serverless friendly).

export class UserError extends Error {}

export type PlanItem = { role: AssetRole | null; model: string; params: GenParams; quantity?: number };
export type Quote = { items: (PlanItem & { costBrl: number })[]; totalBrl: number };

const round4 = (value: number) => Math.round(value * 10000) / 10000;
const MAX_POLL_ERRORS = 3;

export function quote(plan: PlanItem[]): Quote {
  const provider = getProvider();
  const items = plan.map((item) => ({ ...item, costBrl: round4(provider.estimateCost(item.model, item.params).brl * (item.quantity ?? 1)) }));
  return { items, totalBrl: round4(items.reduce((sum, item) => sum + item.costBrl, 0)) };
}

type Created = { id: string; model: string; params: GenParams };

export async function startPlan(input: { userId: string; influencerId: string; contentId?: string; contentKind?: "IMAGE" | "VIDEO" | "ASSEMBLY"; intentId: string; plan: PlanItem[]; expectedBrl: number }) {
  const provider = getProvider(); // fails before any debit when fal is not configured
  const priced = quote(input.plan);
  if (Math.abs(priced.totalBrl - input.expectedBrl) > 0.005) {
    throw new UserError(`O preço mudou de R$ ${input.expectedBrl.toFixed(2)} para R$ ${priced.totalBrl.toFixed(2)}. Revise e confirme de novo.`);
  }

  let created: Created[];
  try {
    created = await prisma.$transaction(async (tx) => {
      // Serialize spends per user so two requests cannot both pass the balance check.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${input.userId} FOR UPDATE`;
      const owned = await tx.influencer.findFirst({ where: { id: input.influencerId, userId: input.userId } });
      if (!owned) throw new UserError("Influencer não encontrado.");
      const content = input.contentId ? await tx.content.findFirst({ where: { id: input.contentId, influencerId: owned.id } }) : null;
      if (input.contentId && !content) throw new UserError("Conteúdo não encontrado.");
      if (content && (priced.items.length !== 1 || priced.items[0].role !== null)) throw new UserError("Etapa inválida.");
      const kind = input.contentKind ?? "IMAGE";
      const target = content ? await tx.step.findFirst({ where: { contentId: content.id, kind } }) : null;
      if (content && !target) throw new UserError("Etapa não encontrada.");
      // Each content step runs once. A second tab or a different intent cannot overwrite a live/completed job.
      if (target && target.status !== "PENDING" && target.status !== "QUOTED") return [];
      const keys = priced.items.map((item) => `${input.intentId}:${item.role ?? kind}`);
      if ((await tx.step.count({ where: { operationKey: { in: keys } } })) > 0) return []; // same intent again: nothing to do
      const { _sum } = await tx.ledgerEntry.aggregate({ where: { userId: input.userId }, _sum: { deltaBrl: true } });
      const balance = Number(_sum.deltaBrl?.toString() ?? 0);
      if (balance + 1e-9 < priced.totalBrl) {
        throw new UserError(`Saldo insuficiente: você tem R$ ${balance.toFixed(2)} e precisa de R$ ${priced.totalBrl.toFixed(2)}.`);
      }
      const rows: Created[] = [];
      for (const [index, item] of priced.items.entries()) {
        const data = {
            influencerId: input.influencerId,
            kind: content ? kind : "CHARACTER" as const,
            role: item.role,
            position: index,
            status: "RUNNING" as const,
            provider: provider.id,
            model: item.model,
            input: item.params as Prisma.InputJsonValue,
            operationKey: keys[index],
            estimatedCostBrl: item.costBrl,
          };
        const step = target
          ? await tx.step.update({ where: { id: target.id }, data: { ...data, position: target.position } })
          : await tx.step.create({ data });
        await tx.ledgerEntry.create({ data: { userId: input.userId, deltaBrl: -item.costBrl, reason: "SPEND", stepId: step.id, note: `Reserva: ${item.role}` } });
        rows.push({ id: step.id, model: item.model, params: item.params });
      }
      if (content && rows.length) await tx.content.update({ where: { id: content.id }, data: { status: "IN_PROGRESS" } });
      return rows;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { started: 0 }; // lost a race on the same intent
    throw error;
  }

  for (const step of created) await submit(step);
  return { started: created.length };
}

export async function submit(step: Created) {
  const claimed = await prisma.step.updateMany({ where: { id: step.id, status: "RUNNING", submissionState: "not_submitted" }, data: { submissionState: "submitting", startedAt: new Date() } });
  if (claimed.count !== 1) return;
  try {
    const handle = await getProvider().generate(step.model, step.params);
    await prisma.step.update({ where: { id: step.id }, data: { submissionState: "submitted", falRequestId: handle.id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // We cannot know whether fal accepted it: keep the reservation, never resend, flag for reconciliation.
    await prisma.step.update({
      where: { id: step.id },
      data: { submissionState: "submission_unknown", status: "FAILED", completedAt: new Date(), error: `Envio incerto (${message}). O valor ficou reservado e nada será reenviado sozinho.` },
    });
  }
}

type RunningStep = Prisma.StepGetPayload<Record<string, never>>;

async function refund(step: RunningStep, message: string) {
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.step.updateMany({ where: { id: step.id, status: "RUNNING", falRequestId: step.falRequestId }, data: { status: "FAILED", completedAt: new Date(), error: message } });
    if (claimed.count !== 1) return;
    const estimated = Number(step.estimatedCostBrl?.toString() ?? 0);
    const owner = await tx.influencer.findUniqueOrThrow({ where: { id: step.influencerId! }, select: { userId: true } });
    // Chained video keeps the cost of completed clips; only unused reservation is returned.
    const unused = round4(estimated - Number(step.actualCostBrl?.toString() ?? 0));
    if (Math.abs(unused) > 0.0001) await tx.ledgerEntry.create({ data: { userId: owner.userId, deltaBrl: unused, reason: unused > 0 ? "REFUND" : "SPEND", stepId: step.id, note: "Ajuste: custo dos clipes concluídos antes da falha" } });
  });
}

async function complete(step: RunningStep, result: GenerationResult) {
  const actual = round4(result.cost.brl);
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.step.updateMany({
      where: { id: step.id, status: "RUNNING", falRequestId: step.falRequestId },
      data: {
        status: "DONE", submissionState: "completed", completedAt: new Date(), actualCostBrl: actual, error: null,
        ...(step.kind === "VIDEO" && (result.raw as { clips?: unknown })?.clips ? { input: { ...(step.input as Prisma.JsonObject), chain: result.raw } as Prisma.InputJsonValue } : {}),
      },
    });
    if (claimed.count !== 1) return; // another poll got here first
    const owner = await tx.influencer.findUniqueOrThrow({ where: { id: step.influencerId! }, select: { userId: true } });
    let faceAssetId: string | null = null;
    for (const image of result.images) {
      const asset = await tx.asset.create({
        data: { userId: owner.userId, influencerId: step.influencerId, contentId: step.contentId, stepId: step.id, kind: "IMAGE", role: step.role, url: image.url, width: image.width, height: image.height },
      });
      if (step.role === "FRONT") faceAssetId = asset.id;
    }
    for (const video of result.videos ?? []) {
      await tx.asset.create({ data: { userId: owner.userId, influencerId: step.influencerId, contentId: step.contentId, stepId: step.id, kind: "VIDEO", url: video.url, width: video.width, height: video.height, durationSec: video.durationSeconds } });
    }
    if (step.kind === "ASSEMBLY" && step.contentId) await tx.content.update({ where: { id: step.contentId }, data: { status: "REVIEW" } });
    if (faceAssetId) await tx.influencer.update({ where: { id: step.influencerId! }, data: { faceAssetId } });
    const diff = round4(Number(step.estimatedCostBrl?.toString() ?? 0) - actual);
    if (Math.abs(diff) > 0.0001) {
      await tx.ledgerEntry.create({ data: { userId: owner.userId, deltaBrl: diff, reason: diff > 0 ? "REFUND" : "SPEND", stepId: step.id, note: "Ajuste para o custo real" } });
    }
  });
}

// Looks at every running step of an influencer once. Safe to call concurrently (all writes are guarded by status).
export async function collectRunning(userId: string, influencerId: string) {
  const owned = await prisma.influencer.findFirst({ where: { id: influencerId, userId }, select: { id: true } });
  if (!owned) return { running: 0 };
  const provider = getProvider();
  const scope = { OR: [{ influencerId }, { content: { influencerId } }] };
  const steps = await prisma.step.findMany({ where: { ...scope, status: "RUNNING", submissionState: { in: ["submitted", "not_submitted"] } } });

  await Promise.all(steps.map(async (step) => {
    const params = step.input as GenParams;
    if (step.submissionState === "not_submitted") {
      await submit({ id: step.id, model: step.model!, params });
      return;
    }
    if (!step.falRequestId) return;
    const handle = { id: step.falRequestId!, provider: provider.id, model: step.model! };
    try {
      const outcome = await provider.checkResult(handle, params);
      if (outcome.state === "done") {
        if (step.kind === "VIDEO" && params.chain) {
          const { advanceVideo } = await import("@/lib/video-chain");
          const result = await advanceVideo(step, outcome.result);
          if (result) await complete(step, result);
        } else await complete(step, outcome.result);
      }
    } catch (error) {
      // A throw can be a failed job or just a network blip: only give up (and refund) after repeated errors.
      const message = error instanceof Error ? error.message : String(error);
      const previous = Number(/^poll:(\d+):/.exec(step.error ?? "")?.[1] ?? 0);
      if (previous + 1 >= MAX_POLL_ERRORS && step.model === "fal-ai/ffmpeg-api/metadata") {
        await prisma.step.updateMany({ where: { id: step.id, status: "RUNNING", falRequestId: step.falRequestId }, data: { status: "FAILED", submissionState: "cost_unknown", completedAt: new Date(), error: "Não foi possível verificar a duração do clipe. O saldo restante ficou reservado para conferência manual." } });
      } else if (previous + 1 >= MAX_POLL_ERRORS) await refund(step, `A geração falhou: ${message}`);
      else await prisma.step.updateMany({ where: { id: step.id, status: "RUNNING", falRequestId: step.falRequestId, error: step.error }, data: { error: `poll:${previous + 1}:${message}` } });
    }
  }));

  const running = await prisma.step.count({ where: { ...scope, status: "RUNNING" } });
  return { running };
}

// Manual reconciliation after checking the provider's usage. No provider call or automatic retry.
export async function reconcileReservation(userId: string, stepId: string, actualBrl: number) {
  if (!Number.isFinite(actualBrl) || actualBrl < 0) throw new UserError("Informe o custo real verificado, em R$.");
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    const step = await tx.step.findFirst({ where: { id: stepId, influencer: { userId } } });
    if (!step || !["submission_unknown", "cost_unknown"].includes(step.submissionState)) throw new UserError("Esta etapa não precisa de reconciliação.");
    if (actualBrl + 0.0001 < Number(step.actualCostBrl ?? 0)) throw new UserError("O custo informado é menor que o dos clipes já verificados.");
    const actual = round4(actualBrl);
    await tx.step.update({ where: { id: step.id }, data: { submissionState: "reconciled", actualCostBrl: actual } });
    const diff = round4(Number(step.estimatedCostBrl ?? 0) - actual);
    if (Math.abs(diff) > 0.0001) await tx.ledgerEntry.create({ data: {
      userId, stepId, deltaBrl: diff, reason: diff > 0 ? "REFUND" : "SPEND", note: "Reconciliação manual: custo verificado no provedor",
    } });
    return { actualBrl: actual, adjustmentBrl: diff };
  });
}
