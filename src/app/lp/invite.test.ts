import { afterAll, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

const sent = vi.hoisted(() => [] as { to: string; token: string }[]);
const pass = vi.hoisted(() => ({ granted: 0 }));
const pending = vi.hoisted(() => [] as Promise<void>[]);
vi.mock("next/server", () => ({ after: (task: () => Promise<void>) => void pending.push(task()) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("@/lib/rate-limit", () => ({ hit: async () => true, clientIp: async () => "test", TOO_MANY_ATTEMPTS: "x" }));
vi.mock("@/lib/account-emails", () => ({ sendTeamAccessEmail: async (to: string, token: string) => void sent.push({ to, token }) }));
vi.mock("@/lib/access", () => ({ gateMode: () => "on", grantPass: async () => void pass.granted++, codeMatches: () => false }));
import { requestInvite } from "./invite";
import { openTeamLink } from "../acesso/actions";

const emails: string[] = [];
afterAll(async () => {
  await prisma.inviteRequest.deleteMany({ where: { email: { in: emails } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
});
const ask = (email: string) => { const form = new FormData(); form.set("email", email); return requestInvite({}, form); };

it("an owner and a stranger get the same answer; only the owner's inbox gets a one-time link", async () => {
  const owner = `invite-owner-${randomUUID()}@example.com`;
  const stranger = `invite-stranger-${randomUUID()}@example.com`;
  emails.push(owner, stranger);
  await prisma.user.create({ data: { email: owner, role: "OWNER" } });

  expect(await ask(stranger)).toEqual({ ok: true });
  expect(await ask(owner)).toEqual({ ok: true });
  await Promise.all(pending);
  expect(sent.map((item) => item.to)).toEqual([owner]);
  expect(await prisma.inviteRequest.count({ where: { email: { in: [owner, stranger] } } })).toBe(1);

  const { token } = sent[0];
  await expect(openTeamLink("forged-token")).rejects.toThrow("redirect:/acesso/forged-token?erro=1");
  expect(pass.granted).toBe(0);
  await expect(openTeamLink(token)).rejects.toThrow("redirect:/login");
  expect(pass.granted).toBe(1);
  await expect(openTeamLink(token)).rejects.toThrow("?erro=1"); // single use
  expect(pass.granted).toBe(1);
});
