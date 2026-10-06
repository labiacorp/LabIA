import { afterAll, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
const auth = vi.hoisted(() => ({ id: "" }));
vi.mock("@/lib/session", () => ({ requireUserId: async () => auth.id }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("@/lib/stripe", async (real) => ({
  ...(await real<typeof import("@/lib/stripe")>()),
  stripeConfigured: () => true,
  stripe: () => ({ checkout: { sessions: { create: async () => { throw new Error("Expired API Key provided"); } } } }),
}));
import { startSubscription } from "./subscribe";
const ids: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: ids } } }); });

it("a Stripe error returns to the plan page with a message instead of the error page", async () => {
  const user = await prisma.user.create({ data: { email: `subscribe-${randomUUID()}@example.com` } });
  ids.push(user.id);
  auth.id = user.id;
  vi.spyOn(console, "error").mockImplementation(() => {});
  await expect(startSubscription()).rejects.toThrow("redirect:/saldo?erro=assinatura");
});
