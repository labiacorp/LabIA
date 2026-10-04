"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const influencerSchema = z.object({
  name: z.string().trim().min(1).max(60),
  niche: z.string().trim().min(1).max(80),
  tone: z.string().trim().min(1).max(80),
  visualSignature: z.string().trim().max(300).default(""),
  persona: z.string().trim().max(1000).default(""),
});

export async function createInfluencer(data: FormData) {
  const userId = await requireUserId();
  const input = influencerSchema.parse(Object.fromEntries(data));
  const influencer = await prisma.influencer.create({ data: { ...input, userId } });
  redirect(`/i/${influencer.id}?aba=personagem`);
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
