import { afterAll, beforeAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { handleMcpMessage } from "./server";
import { authenticateMcpRequest, generateToken } from "./tokens";
import { cleanText } from "./tools";

const ids: string[] = [];
let owner = "", other = "", influencer = "", otherInfluencer = "", readToken = "", writeToken = "";
beforeAll(async () => {
  owner = (await prisma.user.create({ data: { email: `mcp-${randomUUID()}@example.com` } })).id;
  other = (await prisma.user.create({ data: { email: `mcp-other-${randomUUID()}@example.com` } })).id;
  ids.push(owner, other);
  influencer = (await prisma.influencer.create({ data: { userId: owner, name: "Lia​ Moraes", niche: "lifestyle", tone: "leve" } })).id;
  otherInfluencer = (await prisma.influencer.create({ data: { userId: other, name: "Intrusa", niche: "x", tone: "y" } })).id;
  const mint = async (scopes: string[], expiresAt?: Date) => { const t = generateToken(); await prisma.apiToken.create({ data: { userId: owner, name: "t", tokenHash: t.tokenHash, scopes, expiresAt } }); return t.token; };
  readToken = await mint(["read"]); writeToken = await mint(["read", "write"]);
});
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: ids } } }); });

const asPrincipal = async (token: string) => (await authenticateMcpRequest(new Request("http://x", { headers: { authorization: `Bearer ${token}` } })))!;
const call = async (token: string, name: string, args: unknown) => {
  const r = await handleMcpMessage({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }, await asPrincipal(token));
  const res = (r.body as { result: { content: { text: string }[]; isError?: boolean } }).result;
  return { isError: !!res.isError, data: JSON.parse(res.content[0].text) };
};

it("rejects missing, unknown and revoked tokens the same way", async () => {
  const req = (h?: string) => new Request("http://x", { headers: h ? { authorization: h } : {} });
  expect(await authenticateMcpRequest(req())).toBeNull();
  expect(await authenticateMcpRequest(req("Bearer lab_nope"))).toBeNull();
  const t = generateToken();
  await prisma.apiToken.create({ data: { userId: owner, name: "r", tokenHash: t.tokenHash, scopes: ["read"], revokedAt: new Date() } });
  expect(await authenticateMcpRequest(req(`Bearer ${t.token}`))).toBeNull();
});

it("a read token sees its own influencers (cleaned) and cannot write", async () => {
  const list = await call(readToken, "list_influencers", {});
  expect(list.data.influencers).toEqual([expect.objectContaining({ id: influencer, name: "Lia Moraes" })]);
  expect(list.data.notice).toMatch(/not instructions/);
  const tools = await handleMcpMessage({ jsonrpc: "2.0", id: 2, method: "tools/list" }, await asPrincipal(readToken));
  const names = (tools.body as { result: { tools: { name: string }[] } }).result.tools.map((t) => t.name);
  expect(names).not.toContain("create_content_draft");
  const denied = await call(readToken, "create_content_draft", { influencer_id: influencer, title: "x", idea: "y" });
  expect(denied.isError).toBe(true);
  expect(denied.data.error).toBe("insufficient_scope");
});

it("a write token makes a free draft only for its own influencer", async () => {
  const made = await call(writeToken, "create_content_draft", { influencer_id: influencer, title: "3 hábitos", idea: "acordar cedo", script: "Oi!" });
  expect(made.data.cost_brl).toBe(0);
  const got = await call(writeToken, "get_content", { content_id: made.data.content_id });
  expect(got.data.steps.map((s: { kind: string }) => s.kind)).toEqual(["SCRIPT", "IMAGE", "VIDEO", "ASSEMBLY"]);
  expect(got.data.steps[0]).toMatchObject({ status: "DONE", actual_brl: 0 });
  const stolen = await call(writeToken, "create_content_draft", { influencer_id: otherInfluencer, title: "x", idea: "y" });
  expect(stolen.data.error).toBe("not_found");
  const peek = await call(writeToken, "get_content", { content_id: randomUUID() });
  expect(peek.data.error).toBe("not_found");
});

it("validates arguments and strips invisible characters", async () => {
  const bad = await call(writeToken, "create_content_draft", { influencer_id: influencer, title: "", idea: "y" });
  expect(bad.data.error).toBe("invalid_arguments");
  expect(cleanText("a​b‮c")).toBe("abc");
});
