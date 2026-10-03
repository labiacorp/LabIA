"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { createInvite, requireAdmin } from "@/lib/auth/invites";
import { prisma } from "@/lib/db/prisma";

export type CreateInviteState = { error?: string; link?: string };

const createSchema = z.object({
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email().max(254)]),
  workspaceId: z.string(),
});

// Server Action é endpoint público: cada uma confere o admin de novo, além do middleware.
export async function createInviteAction(_previous: CreateInviteState, formData: FormData): Promise<CreateInviteState> {
  const admin = await requireAdmin();
  const parsed = createSchema.safeParse({ email: formData.get("email") ?? "", workspaceId: formData.get("workspaceId") ?? "" });
  if (!parsed.success) return { error: "E-mail inválido." };

  const workspaceId = parsed.data.workspaceId || null;
  if (workspaceId && !(await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true } }))) {
    return { error: "Workspace não encontrado." };
  }

  const token = await createInvite({ createdBy: admin.userId, email: parsed.data.email || null, workspaceId });
  // Origin já foi conferido pelo Next contra o Host (proteção de Server Actions).
  const origin = (await headers()).get("origin") ?? "";
  revalidatePath("/admin/convites");
  return { link: `${origin}/criar-conta?convite=${token}` };
}

export async function revokeInviteAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  // Só convite ainda não usado: o usado fica como registro de quem entrou.
  if (typeof id === "string") await prisma.invite.deleteMany({ where: { id, usedAt: null } });
  revalidatePath("/admin/convites");
}
