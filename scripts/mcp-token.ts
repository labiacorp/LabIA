// Mints, lists or revokes a personal access token for POST /api/mcp. The token is printed once; only its hash is stored.
//   npx tsx --env-file=.env.local scripts/mcp-token.ts create --email you@x.com --name "Social agent" [--scopes read,write] [--days 90]
//   npx tsx --env-file=.env.local scripts/mcp-token.ts list --email you@x.com
//   npx tsx --env-file=.env.local scripts/mcp-token.ts revoke --id <tokenId>
import { prisma } from "../src/lib/prisma";
import { generateToken, MCP_SCOPES } from "../src/lib/mcp/tokens";

const [command, ...rest] = process.argv.slice(2);
const flags = new Map<string, string>();
for (let i = 0; i < rest.length; i += 2) flags.set(rest[i]?.replace(/^--/, ""), rest[i + 1]);
const need = (name: string) => { const v = flags.get(name); if (!v) throw new Error(`Missing --${name}`); return v; };
const userByEmail = async (email: string) => { const u = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true } }); if (!u) throw new Error(`No account for ${email}`); return u; };

async function main() {
  if (command === "create") {
    const user = await userByEmail(need("email"));
    const scopes = (flags.get("scopes") ?? "read,write").split(",").map((s) => s.trim());
    if (!scopes.every((s) => (MCP_SCOPES as readonly string[]).includes(s))) throw new Error(`--scopes must be a subset of ${MCP_SCOPES.join(",")}`);
    const days = Number(flags.get("days") ?? 90);
    if (!(days > 0)) throw new Error("--days must be positive");
    const { token, tokenHash } = generateToken();
    const row = await prisma.apiToken.create({ data: { userId: user.id, name: need("name"), tokenHash, scopes, expiresAt: new Date(Date.now() + days * 86_400_000) } });
    console.log(`Token ${row.id} (expires ${row.expiresAt?.toISOString()}). Shown once:\n${token}`);
  } else if (command === "list") {
    const user = await userByEmail(need("email"));
    for (const t of await prisma.apiToken.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } })) console.log(t.id, t.name, t.scopes.join(","), t.revokedAt ? "REVOKED" : "active", t.lastUsedAt?.toISOString() ?? "never used");
  } else if (command === "revoke") {
    await prisma.apiToken.update({ where: { id: need("id") }, data: { revokedAt: new Date() } });
    console.log("Revoked.");
  } else throw new Error("Usage: create | list | revoke");
}
main().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
