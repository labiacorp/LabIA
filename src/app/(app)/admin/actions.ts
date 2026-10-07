"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/owner";
import { reconcileReservation, UserError } from "@/lib/generation";
import { chargeBrl } from "@/lib/plan";
import { PROMPT_KEYS, PROMPT_MAX, type PromptKey } from "@/lib/prompts";

export type AdminState = { ok: boolean; message: string };

const topUpSchema = z.object({
  userId: z.string().min(1).max(64),
  amount: z.coerce.number().positive().max(1000),
  note: z.string().trim().min(3).max(200),
  key: z.uuid(),
});

// Same bounds as scripts/ledger.ts topup. The AdminAction row is written in the same transaction and
// its unique operationKey turns a double submit into a no-op instead of a second credit.
export async function topUp(_previous: AdminState, form: FormData): Promise<AdminState> {
  const actorId = await requireOwner();
  const input = topUpSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return { ok: false, message: "Informe um valor entre R$ 0,01 e R$ 1.000 e uma nota." };
  const { userId, note, key } = input.data;
  const amount = chargeBrl(input.data.amount); // whole credits, like every ledger row
  try {
    await prisma.$transaction(async (tx) => {
      await tx.adminAction.create({ data: { actorId, action: "TOPUP", targetUserId: userId, data: { amount, note }, operationKey: key } });
      await tx.ledgerEntry.create({ data: { userId, deltaBrl: amount, reason: "TOPUP", note: `Recarga manual: ${note}` } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return { ok: true, message: "Esta recarga já foi registrada." };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003")
      return { ok: false, message: "Conta não encontrada." };
    throw error;
  }
  revalidatePath("/admin");
  return { ok: true, message: "Recarga registrada." };
}

const reconcileSchema = z.object({ stepId: z.string().min(1).max(64), actualBrl: z.coerce.number().min(0).max(10000) });

// The UI form of `scripts/ledger.ts refund`: the total cost verified in the provider dashboard.
// reconcileReservation guards on the step's state, so a repeat is refused rather than applied twice.
export async function reconcileStep(_previous: AdminState, form: FormData): Promise<AdminState> {
  const actorId = await requireOwner();
  const input = reconcileSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return { ok: false, message: "Informe o custo real verificado, em R$." };
  const step = await prisma.step.findUnique({
    where: { id: input.data.stepId },
    select: { influencer: { select: { userId: true } }, content: { select: { influencer: { select: { userId: true } } } } },
  });
  const userId = step?.influencer?.userId ?? step?.content?.influencer.userId;
  if (!userId) return { ok: false, message: "Etapa não encontrada." };
  try {
    const result = await reconcileReservation(userId, input.data.stepId, input.data.actualBrl);
    await prisma.adminAction.create({ data: { actorId, action: "RECONCILE", targetUserId: userId, data: { stepId: input.data.stepId, ...result } } });
  } catch (error) {
    if (error instanceof UserError) return { ok: false, message: error.message };
    throw error;
  }
  revalidatePath("/admin");
  return { ok: true, message: "Etapa reconciliada." };
}

const promptSchema = z.object({ key: z.enum(PROMPT_KEYS as [PromptKey, ...PromptKey[]]), text: z.string().trim().min(1).max(PROMPT_MAX) });

// An override wins over the default from the next generation on; the default text itself never changes.
export async function savePrompt(_previous: AdminState, form: FormData): Promise<AdminState> {
  const actorId = await requireOwner();
  const input = promptSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return { ok: false, message: `Write the prompt (up to ${PROMPT_MAX.toLocaleString("en-US")} characters).` };
  await prisma.$transaction([
    prisma.promptOverride.upsert({ where: { key: input.data.key }, create: { key: input.data.key, text: input.data.text, updatedBy: actorId }, update: { text: input.data.text, updatedBy: actorId } }),
    prisma.adminAction.create({ data: { actorId, action: "PROMPT_SET", data: { key: input.data.key } } }),
  ]);
  revalidatePath("/admin/prompts");
  return { ok: true, message: "Saved. It applies from the next generation." };
}

export async function resetPrompt(_previous: AdminState, form: FormData): Promise<AdminState> {
  const actorId = await requireOwner();
  const input = promptSchema.pick({ key: true }).safeParse(Object.fromEntries(form));
  if (!input.success) return { ok: false, message: "Unknown prompt." };
  await prisma.$transaction([
    prisma.promptOverride.deleteMany({ where: { key: input.data.key } }),
    prisma.adminAction.create({ data: { actorId, action: "PROMPT_RESET", data: { key: input.data.key } } }),
  ]);
  revalidatePath("/admin/prompts");
  return { ok: true, message: "Back to the default prompt." };
}
