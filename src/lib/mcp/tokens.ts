import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

export const TOKEN_PREFIX = "lab_";
export const MCP_SCOPES = ["read", "write"] as const;
export type McpScope = (typeof MCP_SCOPES)[number];
export type McpPrincipal = { tokenId: string; userId: string; scopes: McpScope[] };

// 256 random bits, so a plain sha256 at rest is enough (nothing to brute force, unlike a password).
export const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export function generateToken() {
  const token = TOKEN_PREFIX + crypto.randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

// "Authorization: Bearer lab_..." -> the token's owner, or null for anything wrong with it (missing, unknown,
// revoked, expired). The caller answers all of those with the same 401 so a probe learns nothing.
export async function authenticateMcpRequest(request: Request): Promise<McpPrincipal | null> {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token.startsWith(TOKEN_PREFIX)) return null;
  const row = await prisma.apiToken.findUnique({ where: { tokenHash: hashToken(token) }, select: { id: true, userId: true, scopes: true, expiresAt: true, revokedAt: true, lastUsedAt: true } });
  if (!row || row.revokedAt || (row.expiresAt && row.expiresAt <= new Date())) return null;
  if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > 60_000) void prisma.apiToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return { tokenId: row.id, userId: row.userId, scopes: row.scopes.filter((s): s is McpScope => (MCP_SCOPES as readonly string[]).includes(s)) };
}
