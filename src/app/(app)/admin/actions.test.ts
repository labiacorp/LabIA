import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ owner: vi.fn() }));
vi.mock("@/lib/owner", () => ({ requireOwner: mocks.owner }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { prisma } from "@/lib/prisma";
import { topUp } from "./actions";

const prefix = `admin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
let ownerId = "";
let targetId = "";
beforeAll(async () => {
  ownerId = (await prisma.user.create({ data: { email: `${prefix}-owner@example.com`, role: "OWNER" } })).id;
  targetId = (await prisma.user.create({ data: { email: `${prefix}-user@example.com` } })).id;
});
afterAll(async () => {
  await prisma.adminAction.deleteMany({ where: { targetUserId: targetId } });
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
});

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

describe("admin actions", () => {
  it("every exported action checks the owner before anything else", () => {
    const source = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");
    const bodies = source.split(/^export async function /m).slice(1);
    expect(bodies.length).toBeGreaterThan(0);
    for (const body of bodies) expect(body.split("\n")[1]).toContain("await requireOwner()");
  });

  it("credits once per operation key and records who did it", async () => {
    mocks.owner.mockResolvedValue(ownerId);
    const key = randomUUID();
    const input = { userId: targetId, amount: "12.5", note: "crédito de teste", key };
    const results = await Promise.all([topUp({ ok: false, message: "" }, form(input)), topUp({ ok: false, message: "" }, form(input))]);
    expect(results.every((r) => r.ok)).toBe(true);
    const ledger = await prisma.ledgerEntry.findMany({ where: { userId: targetId } });
    expect(ledger).toHaveLength(1);
    expect(Number(ledger[0].deltaBrl)).toBe(12.5);
    expect(await prisma.adminAction.count({ where: { targetUserId: targetId, actorId: ownerId, action: "TOPUP" } })).toBe(1);
  });

  it("rejects out-of-range amounts and writes nothing when the gate refuses", async () => {
    mocks.owner.mockResolvedValue(ownerId);
    expect((await topUp({ ok: false, message: "" }, form({ userId: targetId, amount: "1001", note: "demais", key: randomUUID() }))).ok).toBe(false);
    mocks.owner.mockRejectedValue(new Error("NOT_FOUND"));
    await expect(topUp({ ok: false, message: "" }, form({ userId: targetId, amount: "5", note: "sem dono", key: randomUUID() }))).rejects.toThrow("NOT_FOUND");
    expect(await prisma.ledgerEntry.count({ where: { userId: targetId } })).toBe(1);
  });
});
