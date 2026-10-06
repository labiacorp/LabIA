import { afterEach, describe, expect, it, vi } from "vitest";
import { googleConfigured, loginErrorMessage } from "./auth-config";
describe("login availability", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("requires both configured OAuth values", () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "test");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    expect(googleConfigured()).toBe(false);
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "test");
    expect(googleConfigured()).toBe(true);
  });
  it("renders controlled copy instead of an arbitrary auth error payload", () => {
    expect(loginErrorMessage("AccessDenied")).toContain("não está aberto");
    expect(loginErrorMessage("<script>secret</script>")).not.toContain(
      "script",
    );
    expect(loginErrorMessage()).toBeNull();
  });
});
