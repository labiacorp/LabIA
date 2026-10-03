import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { runWithExecutionScope, type ExecutionScope } from "@/lib/flows/ownership";

import {
  createFlowDraftInputSchema,
  estimateFlowInputSchema,
  getCapabilitiesInputSchema,
  getFlowInputSchema,
  getProjectInputSchema,
  listAssetsInputSchema,
  listProjectsInputSchema,
  saveFlowDraftInputSchema,
  type CreateFlowDraftInput,
  type EstimateFlowInput,
  type GetFlowInput,
  type GetProjectInput,
  type ListAssetsInput,
  type ListProjectsInput,
  type SaveFlowDraftInput,
} from "./schemas";
import {
  createFlowDraftTool,
  estimateFlowTool,
  getCapabilities,
  getFlowTool,
  getProjectTool,
  listAssetsTool,
  listProjectsTool,
  McpToolError,
  resolveDefaultMcpScope,
  saveFlowDraftTool,
} from "./service";

export const LABIA_MCP_SERVER_INFO = {
  name: "labia-local",
  version: "0.1.0",
} as const;

type ToolResult = Record<string, unknown>;

export type LabiaMcpService = {
  getCapabilities: typeof getCapabilities;
  listProjects: (input: ListProjectsInput) => ReturnType<typeof listProjectsTool>;
  getProject: (input: GetProjectInput) => ReturnType<typeof getProjectTool>;
  listAssets: (input: ListAssetsInput) => ReturnType<typeof listAssetsTool>;
  getFlow: (input: GetFlowInput) => ReturnType<typeof getFlowTool>;
  createFlowDraft: (input: CreateFlowDraftInput) => ReturnType<typeof createFlowDraftTool>;
  saveFlowDraft: (input: SaveFlowDraftInput) => ReturnType<typeof saveFlowDraftTool>;
  estimateFlow: (input: EstimateFlowInput) => ReturnType<typeof estimateFlowTool>;
};

export const defaultLabiaMcpService: LabiaMcpService = {
  getCapabilities,
  listProjects: listProjectsTool,
  getProject: getProjectTool,
  listAssets: listAssetsTool,
  getFlow: getFlowTool,
  createFlowDraft: createFlowDraftTool,
  saveFlowDraft: saveFlowDraftTool,
  estimateFlow: estimateFlowTool,
};

function success(value: ToolResult) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
  };
}

function failure(error: unknown) {
  const message = error instanceof McpToolError
    ? error.message
    : "Não foi possível concluir a operação MCP local.";
  return {
    isError: true,
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }, null, 2) }],
  };
}

export function createLabiaMcpServer(
  service: LabiaMcpService = defaultLabiaMcpService,
  // Bearer e stdio usam o workspace padrão; a chave por usuário passará o principal dela.
  resolveScope: () => Promise<ExecutionScope> = resolveDefaultMcpScope,
) {
  const server = new McpServer(LABIA_MCP_SERVER_INFO);

  // O MCP não tem sessão de usuário: fixa o escopo antes de qualquer serviço ler o workspace.
  async function run(operation: () => Promise<ToolResult>) {
    try {
      const scope = await resolveScope();
      return success(await runWithExecutionScope(scope, operation));
    } catch (error) {
      return failure(error);
    }
  }

  server.registerTool("get_capabilities", {
    description: "Lista capabilities do LabIA local. Execução e start_run permanecem bloqueados.",
    inputSchema: getCapabilitiesInputSchema,
  }, () => run(() => service.getCapabilities()));

  server.registerTool("list_projects", {
    description: "Lista Projetos pertencentes somente ao workspace local resolvido pelo LabIA.",
    inputSchema: listProjectsInputSchema,
  }, (input) => run(() => service.listProjects(input)));

  server.registerTool("get_project", {
    description: "Lê um Projeto do workspace local, sem aceitar ownerId ou workspaceId enviados pelo cliente.",
    inputSchema: getProjectInputSchema,
  }, (input) => run(() => service.getProject(input)));

  server.registerTool("list_assets", {
    description: "Lista Assets de um Projeto local; URLs de storage não são expostas pelo MCP.",
    inputSchema: listAssetsInputSchema,
  }, (input) => run(() => service.listAssets(input)));

  server.registerTool("get_flow", {
    description: "Lê o grafo real de um Flow pertencente ao workspace local.",
    inputSchema: getFlowInputSchema,
  }, (input) => run(() => service.getFlow(input)));

  server.registerTool("create_flow_draft", {
    description: "Cria um Projeto e Flow draft sem gerar mídia e sempre retorna generationStarted=false.",
    inputSchema: createFlowDraftInputSchema,
  }, (input) => run(() => service.createFlowDraft(input)));

  server.registerTool("save_flow_draft", {
    description: "Valida e salva um grafo draft; nunca inicia geração.",
    inputSchema: saveFlowDraftInputSchema,
  }, (input) => run(() => service.saveFlowDraft(input)));

  server.registerTool("estimate_flow", {
    description: "Calcula uma estimativa atual do Flow sem criar execução ou iniciar geração.",
    inputSchema: estimateFlowInputSchema,
  }, (input) => run(() => service.estimateFlow(input)));

  return server;
}
