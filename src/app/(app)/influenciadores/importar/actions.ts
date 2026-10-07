"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { NICHES } from "../nova/niches";

export type ImportState = { error?: string };

const schema = z.object({
  asset: z.string().min(1, "Pick the image of the influencer."),
  name: z.string().trim().min(1, "Give the influencer a name.").max(60),
  niche: z.string().refine((value) => NICHES.includes(value), "Pick a niche."),
  description: z.string().trim().max(400).default(""),
});

// Free: no generation. The imported image becomes her face (front portrait), so she works in Trends and in Content like one created here.
export async function importInfluencer(_previous: ImportState, form: FormData): Promise<ImportState> {
  const userId = await requireUserId();
  const input = schema.safeParse(Object.fromEntries(form));
  if (!input.success) return { error: input.error.issues[0]?.message ?? "Check the fields." };
  const created = await prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findFirst({ where: { id: input.data.asset, userId, kind: "IMAGE", storageKey: { not: null }, influencerId: null } });
    if (!asset) return null;
    const influencer = await tx.influencer.create({ data: { userId, name: input.data.name, niche: input.data.niche, tone: "natural", visualSignature: input.data.description, faceAssetId: asset.id } });
    await tx.asset.update({ where: { id: asset.id }, data: { influencerId: influencer.id, role: "FRONT" } });
    return influencer.id;
  });
  if (!created) return { error: "This image is not available. Import it again." };
  revalidatePath("/", "layout");
  redirect(`/i/${created}`);
}
