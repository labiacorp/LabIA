import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { MCP_TOOLS, type ToolResult } from "./tools";
import type { McpPrincipal } from "./tokens";

// Minimal MCP over Streamable HTTP: stateless, JSON replies only (no sessions, no SSE), so it runs as a plain route handler.
const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const INSTRUCTIONS = "LabIA makes content for AI influencers, paid per use in BRL. You can read influencers, contents, costs and balance, and create free drafts. You cannot spend money: the user confirms every paid generation in the app after seeing its price.";
const rpc = z.object({ jsonrpc: z.literal("2.0"), id: z.union([z.string(), z.number()]).optional(), method: z.string(), params: z.record(z.string(), z.unknown()).optional() });
export type McpHttpResult = { status: number; body?: unknown };
type Id = string | number | null;
const err = (id: Id, code: number, message: string): McpHttpResult => ({ status: 200, body: { jsonrpc: "2.0", id, error: { code, message } } });
const ok = (id: Id, result: unknown): McpHttpResult => ({ status: 200, body: { jsonrpc: "2.0", id, result } });

const asContent = (r: ToolResult) => ({ content: [{ type: "text", text: JSON.stringify(r.ok ? r.data : { error: r.code, message: r.message }) }], ...(r.ok ? {} : { isError: true }) });

async function callTool(principal: McpPrincipal, params: Record<string, unknown> | undefined) {
  const tool = MCP_TOOLS.find((t) => t.name === params?.name);
  if (!tool) return null;
  let result: ToolResult;
  if (!principal.scopes.includes(tool.scope)) result = { ok: false, code: "insufficient_scope", message: `This token lacks the "${tool.scope}" scope.` };
  else {
    const args = tool.input.safeParse(params?.arguments ?? {});
    if (!args.success) result = { ok: false, code: "invalid_arguments", message: args.error.issues.map((i) => `${i.path.join(".") || "arguments"}: ${i.message}`).join("; ") };
    else try { result = await tool.run(principal, args.data as never); } catch (e) { console.error("mcp tool failed", tool.name, e); result = { ok: false, code: "internal_error", message: "Something went wrong. Try again later." }; }
  }
  await prisma.apiUsage.create({ data: { tokenId: principal.tokenId, tool: tool.name, outcome: result.ok ? "ok" : result.code } }).catch(() => {});
  return asContent(result);
}

export async function handleMcpMessage(body: unknown, principal: McpPrincipal): Promise<McpHttpResult> {
  const parsed = rpc.safeParse(body);
  if (!parsed.success) return { status: 400, body: { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid request" } } };
  const { id, method, params } = parsed.data;
  if (id === undefined) return { status: 202 };
  switch (method) {
    case "initialize": {
      const asked = params?.protocolVersion;
      return ok(id, { protocolVersion: typeof asked === "string" && SUPPORTED_VERSIONS.includes(asked) ? asked : SUPPORTED_VERSIONS[0], capabilities: { tools: { listChanged: false } }, serverInfo: { name: "labia", version: "1.0.0" }, instructions: INSTRUCTIONS });
    }
    case "ping": return ok(id, {});
    case "tools/list":
      return ok(id, { tools: MCP_TOOLS.filter((t) => principal.scopes.includes(t.scope)).map((t) => ({ name: t.name, description: t.description, inputSchema: (({ $schema: _s, ...rest }) => rest)(z.toJSONSchema(t.input, { io: "input" }) as Record<string, unknown>), annotations: { readOnlyHint: t.scope === "read", destructiveHint: false } })) });
    case "tools/call": { const r = await callTool(principal, params); return r ? ok(id, r) : err(id, -32602, "Unknown tool"); }
    default: return err(id, -32601, "Method not found");
  }
}
