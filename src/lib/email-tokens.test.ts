import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { consumeEmailToken, consumeVerifyCode, issueEmailToken } from "./email-tokens";

const prefix = `tokens-${Date.now()}-${Math.random().toString(36).slice(2)}`;
afterAll(() => prisma.user.deleteMany({ where: { email: { startsWith: prefix } } }));
const user = (name: string) => prisma.user.create({ data: { email: `${prefix}-${name}@example.com` } });

describe("e-mail tokens", () => {
  it("are single use even when two clicks race, and only the latest one of a purpose works", async () => {
    const { id } = await user("race");
    const first = await issueEmailToken(id, "RESET");
    const second = await issueEmailToken(id, "RESET");
    expect(await consumeEmailToken(first.token, ["RESET"])).toBeNull();
    const results = await Promise.all([consumeEmailToken(second.token, ["RESET"]), consumeEmailToken(second.token, ["RESET"])]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });
  it("refuse the wrong purpose, an expired token and a stored hash", async () => {
    const { id } = await user("purpose");
    const { token } = await issueEmailToken(id, "RESET");
    expect(await consumeEmailToken(token, ["VERIFY", "CHANGE_EMAIL"])).toBeNull();
    const row = await prisma.emailToken.findFirstOrThrow({ where: { userId: id } });
    expect(await consumeEmailToken(row.tokenHash, ["RESET"])).toBeNull();
    await prisma.emailToken.update({ where: { id: row.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await consumeEmailToken(token, ["RESET"])).toBeNull();
  });
  it("accept the 6-digit code once, only for its own account", async () => {
    const a = await user("code-a");
    const b = await user("code-b");
    const { code } = await issueEmailToken(a.id, "VERIFY");
    expect(code).toMatch(/^\d{6}$/);
    expect(await consumeVerifyCode(b.id, code!)).toBeNull();
    expect(await consumeVerifyCode(a.id, code!)).not.toBeNull();
    expect(await consumeVerifyCode(a.id, code!)).toBeNull();
  });
});
