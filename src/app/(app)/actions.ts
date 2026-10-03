"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { signOut } from "@/auth";
import { PIPELINE } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const influencerSchema = z.object({
  name: z.string().trim().min(1).max(60),
  niche: z.string().trim().min(1).max(80),
  tone: z.string().trim().min(1).max(80),
  persona: z.string().trim().max(1000).default(""),
});

export async function createInfluencer(data: FormData) {
  const userId = await requireUserId();
  const input = influencerSchema.parse(Object.fromEntries(data));
  const influencer = await prisma.influencer.create({ data: { ...input, userId } });
  redirect(`/i/${influencer.id}`);
}

const contentSchema = z.object({
  title: z.string().trim().min(1).max(120),
  idea: z.string().trim().max(2000).default(""),
});

export async function createContent(influencerId: string, data: FormData) {
  const userId = await requireUserId();
  const input = contentSchema.parse(Object.fromEntries(data));
  const owned = await prisma.influencer.findFirst({ where: { id: influencerId, userId }, select: { id: true } });
  if (!owned) redirect("/");
  const content = await prisma.content.create({
    data: {
      ...input,
      influencerId,
      steps: { create: PIPELINE.map((step, position) => ({ kind: step.kind, position })) },
    },
  });
  redirect(`/i/${influencerId}/c/${content.id}`);
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
