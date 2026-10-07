"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ownerSession } from "@/lib/owner";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { NETWORKS, networkVisible, type NetworkId } from "@/lib/social/networks";
import { createPosts, SocialError } from "@/lib/social/posts";

const GENERIC_ERROR = "Não foi possível publicar agora. Tente novamente.";

export type PublishTargets = {
  accounts: { id: string; network: NetworkId; handle: string }[];
  assetKind: "IMAGE" | "VIDEO";
  usdBrlRate: number;
};

export async function getPublishTargets(assetId: string): Promise<PublishTargets | { error: string }> {
  const userId = await requireUserId();
  const asset = await prisma.asset.findFirst({ where: { id: assetId, userId }, select: { kind: true } });
  if (!asset || (asset.kind !== "IMAGE" && asset.kind !== "VIDEO")) return { error: "Este arquivo não pode ser publicado." };
  const kind = asset.kind;

  const session = await auth();
  const owner = ownerSession(session)
    ? (await prisma.user.findUnique({ where: { id: userId }, select: { role: true } }))?.role === "OWNER"
    : false;
  const rows = await prisma.socialAccount.findMany({
    where: { userId, status: "CONNECTED" },
    orderBy: { connectedAt: "desc" },
  });
  const accounts = rows
    .filter((row) => {
      const info = NETWORKS.find((network) => network.id === row.network);
      return info && networkVisible(info, owner) === "active" && info.media.includes(kind);
    })
    .map((row) => ({ id: row.id, network: row.network as NetworkId, handle: row.handle }));
  return { accounts, assetKind: kind, usdBrlRate: Number(process.env.USD_BRL_RATE) || 5.4 };
}

export async function publishAction(input: {
  intentId: string;
  assetId: string;
  contentId: string | null;
  accountIds: string[];
  text: string;
  aiLabel: boolean;
  scheduledAt: string | null;
  expectedBrl: number;
}): Promise<{ ok: true; count: number } | { error: string }> {
  const userId = await requireUserId();
  let scheduledAt: Date | null = null;
  if (input.scheduledAt) {
    scheduledAt = new Date(input.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) return { error: "Escolha um horário válido." };
  }
  try {
    const { postIds } = await createPosts({
      userId,
      intentId: input.intentId,
      accountIds: input.accountIds,
      assetId: input.assetId,
      contentId: input.contentId,
      text: input.text,
      aiLabel: input.aiLabel,
      scheduledAt,
      expectedBrl: input.expectedBrl,
    });
    revalidatePath("/integracoes");
    return { ok: true, count: postIds.length };
  } catch (error) {
    return { error: error instanceof SocialError ? error.message : GENERIC_ERROR };
  }
}
