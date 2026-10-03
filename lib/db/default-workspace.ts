import { prisma } from "@/lib/db/prisma";

export const DEFAULT_WORKSPACE_SLUG = process.env.DEFAULT_WORKSPACE_SLUG ?? "felipe-labia";

// Workspace do Felipe antes do login: dono do bootstrap e escopo do MCP por Bearer.
export function ensureDefaultWorkspace() {
  return prisma.workspace.upsert({
    where: { slug: DEFAULT_WORKSPACE_SLUG },
    update: {},
    create: { name: "Felipe Zilli", slug: DEFAULT_WORKSPACE_SLUG, spendEnabled: true },
  });
}
