import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userId: vi.fn(),
  update: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ requireUserId: mocks.userId }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { update: mocks.update } } }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { updateAccount } from "./actions";

describe("account profile update", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.userId.mockResolvedValue("signed-in-user");
    mocks.update.mockResolvedValue({});
  });
  const input = (name: string) => {
    const form = new FormData();
    form.set("name", name);
    form.set("userId", "someone-else");
    form.set("email", "forged@example.com");
    return form;
  };
  it("updates only the name when omitted fields must retain existing preferences", async () => {
    expect(
      (await updateAccount({ message: "", ok: false }, input("  Ana  "))).ok,
    ).toBe(true);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "signed-in-user" },
      data: {
        name: "Ana",
      },
    });
    expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
  });
  it("rejects empty and oversized names without writing", async () => {
    for (const name of ["   ", "a".repeat(81)])
      expect(
        (await updateAccount({ message: "", ok: false }, input(name))).ok,
      ).toBe(false);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("requires authentication before writing", async () => {
    mocks.userId.mockRejectedValue(new Error("redirect"));
    await expect(
      updateAccount({ message: "", ok: false }, input("Ana")),
    ).rejects.toThrow("redirect");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("returns a useful error without leaking database details", async () => {
    mocks.update.mockRejectedValue(new Error("private database detail"));
    const result = await updateAccount(
      { message: "", ok: false },
      input("Ana"),
    );
    expect(result.ok).toBe(false);
    expect(result.message).not.toContain("private");
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});

it("rejects oversized bio and invalid preferences before writing", async () => {
  mocks.update.mockClear();
  for (const [field, value] of [
    ["bio", "x".repeat(241)],
    ["defaultAspectRatio", "2:9"],
  ]) {
    const form = new FormData();
    form.set("name", "Ana");
    form.set(field, value);
    expect((await updateAccount({ message: "", ok: false }, form)).ok).toBe(
      false,
    );
  }
  expect(mocks.update).not.toHaveBeenCalled();
});
