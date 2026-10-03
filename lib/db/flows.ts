import "server-only";

import type { Prisma } from "@prisma/client";

import { hasDatabaseEnv } from "@/lib/db/env";
import { prisma } from "@/lib/db/prisma";
import { getOwnedExecutionScope } from "@/lib/flows/ownership";
import { starterFlowGraph, type FlowGraph } from "@/lib/flows/graph";
import { createFlowTemplateGraph, type FlowTemplateId } from "@/lib/flows/templates";

export { parseStoredFlowGraph } from "@/lib/flows/parse";
export { ensureDefaultWorkspace } from "@/lib/db/default-workspace";

export async function getOrCreateStarterFlow() {
  const { workspaceId } = await getOwnedExecutionScope();

  const existingFlow = await prisma.flow.findFirst({
    where: {
      workspaceId,
      isTemplate: false,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (existingFlow) {
    return existingFlow;
  }

  return prisma.flow.create({
    data: {
      workspaceId,
      name: "Fluxo inicial",
      graph: starterFlowGraph as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function createFlow(name = "Novo fluxo", template?: FlowTemplateId) {
  const { workspaceId } = await getOwnedExecutionScope();

  return prisma.flow.create({
    data: {
      workspaceId,
      name,
      graph: (template ? createFlowTemplateGraph(template) : starterFlowGraph) as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function listRecentFlows(limit = 6, search = "") {
  if (!hasDatabaseEnv()) {
    throw new Error("Não foi possível carregar os fluxos.");
  }

  const { workspaceId } = await getOwnedExecutionScope();

  return prisma.flow.findMany({
    where: {
      workspaceId,
      isTemplate: false,
      ...(search.trim() ? { OR: [
        { name: { contains: search.trim(), mode: "insensitive" as const } },
        { project: { name: { contains: search.trim(), mode: "insensitive" as const } } },
      ] } : {}),
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: limit,
    include: {
      project: { select: { id: true, name: true } },
      runs: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          status: true,
          outputs: true,
          totalActualCostBrl: true,
          totalEstimatedCostBrl: true,
        },
        take: 1,
      },
    },
  });
}

export async function getCurrentMonthSpendBrl(workspaceId: string) {
  if (!hasDatabaseEnv()) {
    throw new Error("Não foi possível carregar o gasto do mês.");
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const result = await prisma.generation.aggregate({
    where: {
      workspaceId,
      createdAt: {
        gte: monthStart,
      },
    },
    _sum: {
      actualCostBrl: true,
    },
  });

  return Number(result._sum.actualCostBrl ?? 0);
}

export async function getCurrentMonthGenerationCount(workspaceId: string) {
  if (!hasDatabaseEnv()) throw new Error("Não foi possível carregar as gerações do mês.");
  const now = new Date();
  return prisma.generation.count({ where: {
    workspaceId,
    createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
  } });
}

export async function updateFlowGraph({
  flowId,
  name,
  graph,
}: {
  flowId: string;
  name: string;
  graph: FlowGraph;
}) {
  return prisma.flow.update({
    where: {
      id: flowId,
    },
    data: {
      name,
      graph: graph as unknown as Prisma.InputJsonValue,
    },
  });
}
