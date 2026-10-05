import { describe, expect, it, vi } from "vitest";
import { mediaSignature, validMediaSignature } from "./media-access";
describe("temporary provider references", () => {
  it("binds access to the asset and deadline", () => {
    vi.stubEnv("AUTH_SECRET", "x".repeat(32));
    const expires = Date.now() + 60000;
    const signature = mediaSignature("owned", expires);
    expect(validMediaSignature("owned", String(expires), signature)).toBe(true);
    expect(validMediaSignature("foreign", String(expires), signature)).toBe(
      false,
    );
    expect(
      validMediaSignature("owned", String(Date.now() - 1), signature),
    ).toBe(false);
    expect(validMediaSignature("owned", String(expires), "0".repeat(64))).toBe(
      false,
    );
    vi.unstubAllEnvs();
  });
});
