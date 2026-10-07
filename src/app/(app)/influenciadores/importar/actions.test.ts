import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/lib/session", () => ({ requireUserId: async () => mocks.userId }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw Error(url); } }));
import { prisma } from "@/lib/prisma";
import { importInfluencer } from "./actions";

const prefix = `import-${randomUUID()}`;
const ids: string[] = [];
const form = (fields: Record<string, string>) => { const data = new FormData(); for (const [key, value] of Object.entries(fields)) data.set(key, value); return data; };
const asset = (userId: string, extra: object = {}) => prisma.asset.create({ data: { userId, kind: "IMAGE", url: "/mock/portrait.svg", storageKey: `references/${randomUUID()}.png`, ...extra } });

beforeAll(async () => {
  for (const name of ["owner", "other"]) ids.push((await prisma.user.create({ data: { email: `${prefix}-${name}@example.com` } })).id);
  mocks.userId = ids[0];
});
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: ids } } }); });

describe("import an existing influencer", () => {
  it("turns an imported image into her face, once, only for its owner", async () => {
    const mine = await asset(ids[0]);
    const foreign = await asset(ids[1]);
    const fields = { name: "Malu", niche: "Lifestyle", description: "curly hair" };
    expect((await importInfluencer({}, form({ ...fields, asset: foreign.id }))).error).toMatch(/not available/);
    await expect(importInfluencer({}, form({ ...fields, asset: mine.id }))).rejects.toThrow(/^\/i\//);
    const influencer = await prisma.influencer.findFirstOrThrow({ where: { userId: ids[0] } });
    expect(influencer.faceAssetId).toBe(mine.id);
    expect(await prisma.asset.findUniqueOrThrow({ where: { id: mine.id } })).toMatchObject({ influencerId: influencer.id, role: "FRONT" });
    expect((await importInfluencer({}, form({ ...fields, asset: mine.id }))).error).toMatch(/not available/);
    expect(await prisma.influencer.count({ where: { userId: ids[0] } })).toBe(1);
  });

  it("rejects a missing name or an unknown niche", async () => {
    const mine = await asset(ids[0]);
    expect((await importInfluencer({}, form({ asset: mine.id, name: " ", niche: "Lifestyle" }))).error).toMatch(/name/i);
    expect((await importInfluencer({}, form({ asset: mine.id, name: "Ana", niche: "Nope" }))).error).toMatch(/niche/i);
  });
});
