import { describe, expect, it } from "vitest";

import { hashPassword, passwordError, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies the right password and rejects wrong, missing and malformed hashes", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash).not.toContain("correct horse");
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("wrong password!", hash)).toBe(false);
    expect(await verifyPassword("anything", null)).toBe(false);
    expect(await verifyPassword("anything", "junk")).toBe(false);
    expect(await hashPassword("correct horse battery")).not.toBe(hash);
  });

  it("enforces length", () => {
    expect(passwordError("abc")).not.toBeNull();
    expect(passwordError("long enough pass")).toBeNull();
    expect(passwordError("x".repeat(129))).not.toBeNull();
  });
});
