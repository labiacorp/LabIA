import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { hit } from "./rate-limit";
const keys: string[] = [];
const key = () => {
  const value = `qa-rate-${randomUUID()}`;
  keys.push(value);
  return value;
};
describe.skipIf(!process.env.DATABASE_URL)("concurrent access limits", () => {
  afterAll(async () => {
    await prisma.rateLimitEvent.deleteMany({ where: { key: { in: keys } } });
  });
  it("admits exactly the limit under concurrent requests without extending a denial", async () => {
    const value = key();
    const accepted = await Promise.all(
      Array.from({ length: 12 }, () => hit(value, 3, 600)),
    );
    expect(accepted.filter(Boolean)).toHaveLength(3);
    expect(await prisma.rateLimitEvent.count({ where: { key: value } })).toBe(
      3,
    );
    expect(await hit(value, 3, 600)).toBe(false);
    expect(await prisma.rateLimitEvent.count({ where: { key: value } })).toBe(
      3,
    );
  });
  it("keeps keys independent and expires old attempts", async () => {
    const value = key();
    await prisma.rateLimitEvent.create({
      data: { key: value, createdAt: new Date(Date.now() - 700000) },
    });
    expect(await hit(value, 1, 600)).toBe(true);
    expect(await hit(value, 1, 600)).toBe(false);
    expect(await hit(key(), 1, 600)).toBe(true);
  });
});
