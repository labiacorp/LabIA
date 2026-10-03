import { AsyncLocalStorage } from "node:async_hooks";

import { requireSessionScope } from "@/lib/auth/session";
import { ensureDefaultWorkspace } from "@/lib/db/default-workspace";
import { prisma } from "@/lib/db/prisma";
import { getLocalOwnerId } from "@/lib/provider-connections/security";

export type ExecutionScope = { workspaceId: string; ownerId: string };

const pinnedScope = new AsyncLocalStorage<ExecutionScope>();

// Worker e MCP rodam sem sessão de usuário: o escopo vem do registro do job ou do Bearer.
export function runWithExecutionScope<T>(scope: ExecutionScope, run: () => Promise<T>) {
  return pinnedScope.run(scope, run);
}

// Job antigo, enfileirado antes do login, não traz ownerId: segue o dono local de antes.
function runAsJob<T>(workspaceId: string, ownerId: string | undefined, run: () => Promise<T>) {
  return runWithExecutionScope({ workspaceId, ownerId: ownerId ?? getLocalOwnerId() }, run);
}

export async function runAsFlowRunJob<T>(flowRunId: string, ownerId: string | undefined, run: () => Promise<T>) {
  const flowRun = await prisma.flowRun.findUnique({ where: { id: flowRunId }, select: { workspaceId: true } });
  if (!flowRun) throw new Error(`FlowRun não encontrado: ${flowRunId}`);
  return runAsJob(flowRun.workspaceId, ownerId, run);
}

export async function runAsGenerationJob<T>(generationId: string, ownerId: string | undefined, run: () => Promise<T>) {
  const generation = await prisma.generation.findUnique({ where: { id: generationId }, select: { workspaceId: true } });
  if (!generation) throw new Error(`Generation não encontrada: ${generationId}`);
  return runAsJob(generation.workspaceId, ownerId, run);
}

// MCP por Bearer: workspace padrão, como antes do login, até o M2 da 09-mcp.
export async function getDefaultExecutionScope(): Promise<ExecutionScope> {
  const workspace = await ensureDefaultWorkspace();
  return { workspaceId: workspace.id, ownerId: getLocalOwnerId() };
}

// Ponto único de escopo: sessão do usuário logado, nunca workspaceId vindo do cliente.
export async function getOwnedExecutionScope(): Promise<ExecutionScope> {
  return pinnedScope.getStore() ?? requireSessionScope();
}

export async function getOwnedFlow(flowId: string) {
  const { workspaceId } = await getOwnedExecutionScope();
  return prisma.flow.findFirst({ where: { id: flowId, workspaceId } });
}

export async function getOwnedBrand(brandId: string) {
  const { workspaceId } = await getOwnedExecutionScope();
  return prisma.brand.findFirst({ where: { id: brandId, workspaceId } });
}

export async function getOwnedFlowRun(flowRunId: string) {
  const { workspaceId } = await getOwnedExecutionScope();
  return prisma.flowRun.findFirst({ where: { id: flowRunId, workspaceId } });
}

export async function getOwnedGeneration(generationId: string) {
  const { workspaceId } = await getOwnedExecutionScope();
  return prisma.generation.findFirst({ where: { id: generationId, workspaceId }, include: { assets: true } });
}

export async function getOwnedConnection(connectionId: string) {
  const { workspaceId, ownerId } = await getOwnedExecutionScope();
  return prisma.providerConnection.findFirst({ where: { id: connectionId, workspaceId, ownerId }, include: { capabilities: true } });
}

export async function assertOwnedFlowBrand(brandId: string | null | undefined, workspaceId: string) {
  if (!brandId) return;
  const brand = await prisma.brand.findFirst({ where: { id: brandId, workspaceId }, select: { id: true } });
  if (!brand) throw new Error("Brand do Flow não pertence ao workspace autorizado.");
}

type OwnershipRepository = {
  flow(id: string): Promise<{ id: string; workspaceId: string } | null>;
  brand(id: string): Promise<{ id: string; workspaceId: string } | null>;
  flowRun(id: string): Promise<{ id: string; workspaceId: string; flowId?: string } | null>;
  connection(id: string): Promise<{ id: string; workspaceId: string; ownerId?: string; provider?: string } | null>;
  flowRunNode?(flowRunId: string, nodeId: string): Promise<{ nodeId: string } | null>;
};

export async function assertOwnedExecutionReferences(input: {
  ownerId: string;
  workspaceId: string;
  flowId?: string;
  brandId?: string;
  flowRunId?: string;
  flowNodeId?: string;
  connectionId?: string;
  providerId?: string;
  repository: OwnershipRepository;
}) {
  if (input.flowId) {
    const flow = await input.repository.flow(input.flowId);
    if (!flow || flow.workspaceId !== input.workspaceId) throw new Error("Flow não pertence ao workspace autorizado.");
  }
  if (input.brandId) {
    const brand = await input.repository.brand(input.brandId);
    if (!brand || brand.workspaceId !== input.workspaceId) throw new Error("Brand não pertence ao workspace autorizado.");
  }
  if (input.flowRunId) {
    const flowRun = await input.repository.flowRun(input.flowRunId);
    if (!flowRun || flowRun.workspaceId !== input.workspaceId || (input.flowId && flowRun.flowId !== input.flowId)) throw new Error("FlowRun não pertence ao Flow/workspace autorizado.");
    if (flowRun?.flowId) {
      const flow = await input.repository.flow(flowRun.flowId);
      if (!flow || flow.workspaceId !== input.workspaceId) throw new Error("Flow do FlowRun não pertence ao workspace autorizado.");
    }
  }
  if (input.flowRunId && input.flowNodeId && input.repository.flowRunNode) {
    const node = await input.repository.flowRunNode(input.flowRunId, input.flowNodeId);
    if (!node) throw new Error("Nó não pertence ao FlowRun autorizado.");
  }
  if (input.connectionId) {
    const connection = await input.repository.connection(input.connectionId);
    if (!connection || connection.workspaceId !== input.workspaceId || connection.ownerId !== input.ownerId || (input.providerId && connection.provider !== input.providerId)) throw new Error("Conexão não pertence ao owner/workspace/provider autorizado.");
  }
}
