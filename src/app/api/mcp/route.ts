import { NextResponse } from "next/server";
import { authenticateMcpRequest } from "@/lib/mcp/tokens";
import { handleMcpMessage } from "@/lib/mcp/server";
import { hit } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 64 * 1024;

// MCP over Streamable HTTP, POST only. Auth is a personal access token (scripts/mcp-token.ts), never a browser session.
export async function POST(request: Request) {
  const principal = await authenticateMcpRequest(request);
  if (!principal) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="labia"' } });
  if (!(await hit(`mcp:${principal.tokenId}`, 60, 60))) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "60" } });
  const text = await request.text().catch(() => null);
  if (text === null || text.length > MAX_BODY_BYTES) return NextResponse.json({ error: "invalid_request" }, { status: text === null ? 400 : 413 });
  let body: unknown;
  try { body = JSON.parse(text); } catch { return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 }); }
  const result = await handleMcpMessage(body, principal);
  return result.body === undefined ? new NextResponse(null, { status: result.status }) : NextResponse.json(result.body, { status: result.status });
}
export const GET = () => new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
export const DELETE = GET;
