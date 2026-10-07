import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  order: [] as string[],
  disconnect: vi.fn(),
  cancel: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/session", () => ({
  requireUserId: async () => {
    mocks.order.push("session");
    return "user-1";
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/social/posts", async () => {
  const { SocialError } = await import("@/lib/social/errors");
  return { SocialError, disconnectAccount: mocks.disconnect, cancelPost: mocks.cancel };
});

import { SocialError } from "@/lib/social/errors";
import { cancelPostAction, disconnectAction } from "./actions";

const FALLBACK = "Não foi possível concluir. Tente de novo.";

describe("integrations actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.order.length = 0;
  });

  it("disconnect authenticates first and passes the session user", async () => {
    mocks.disconnect.mockImplementation(async () => {
      mocks.order.push("disconnect");
      return { canceled: 2 };
    });
    expect(await disconnectAction("acc")).toEqual({ canceled: 2 });
    expect(mocks.order).toEqual(["session", "disconnect"]);
    expect(mocks.disconnect).toHaveBeenCalledWith("user-1", "acc");
    expect(mocks.revalidate).toHaveBeenCalledWith("/integracoes");
  });

  it("cancel authenticates first and passes the session user", async () => {
    mocks.cancel.mockImplementation(async () => {
      mocks.order.push("cancel");
    });
    expect(await cancelPostAction("post")).toEqual({ ok: true });
    expect(mocks.order).toEqual(["session", "cancel"]);
    expect(mocks.cancel).toHaveBeenCalledWith("user-1", "post");
    expect(mocks.revalidate).toHaveBeenCalledWith("/integracoes");
  });

  it("returns the SocialError message", async () => {
    mocks.disconnect.mockRejectedValue(new SocialError("Conta não encontrada."));
    mocks.cancel.mockRejectedValue(new SocialError("Publicação não encontrada."));
    expect(await disconnectAction("a")).toEqual({ error: "Conta não encontrada." });
    expect(await cancelPostAction("p")).toEqual({ error: "Publicação não encontrada." });
  });

  it("hides unexpected errors behind generic copy", async () => {
    mocks.disconnect.mockRejectedValue(new Error("db password leak"));
    mocks.cancel.mockRejectedValue(new Error("boom"));
    expect(await disconnectAction("a")).toEqual({ error: FALLBACK });
    expect(await cancelPostAction("p")).toEqual({ error: FALLBACK });
  });
});
