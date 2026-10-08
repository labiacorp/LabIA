import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userId: vi.fn(),
  confirmIdentity: vi.fn(),
  postCount: vi.fn(),
  influencerCount: vi.fn(),
  accounts: vi.fn(),
  assets: vi.fn(),
  deleteMany: vi.fn(),
  disconnect: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn(), signIn: vi.fn(), signOut: mocks.signOut }));
vi.mock("@/lib/session", () => ({ requireUserId: mocks.userId }));
vi.mock("@/lib/reauth", () => ({ confirmIdentity: mocks.confirmIdentity, identityMessages: {} }));
vi.mock("@/lib/password", () => ({ hashPassword: vi.fn(), passwordError: vi.fn() }));
vi.mock("@/lib/email", () => ({ emailEnabled: vi.fn() }));
vi.mock("@/lib/email-tokens", () => ({ issueEmailToken: vi.fn() }));
vi.mock("@/lib/account-emails", () => ({ sendEmailChangeConfirm: vi.fn() }));
vi.mock("@/lib/reference-storage", () => ({ removeReference: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ hit: vi.fn(), TOO_MANY_ATTEMPTS: "x" }));
vi.mock("@/lib/social/posts", () => ({ disconnectAccount: mocks.disconnect }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    asset: { findMany: mocks.assets },
    socialPost: { count: mocks.postCount },
    influencer: { count: mocks.influencerCount },
    socialAccount: { findMany: mocks.accounts },
    user: { deleteMany: mocks.deleteMany },
  },
}));
import { connectGoogle, deleteAccount } from "./actions";
import { signIn } from "@/auth";

const form = () => {
  const data = new FormData();
  data.set("confirmation", "excluir");
  return data;
};

describe("connecting Google", () => {
  it("starts Google sign-in and returns to the security page", async () => {
    await connectGoogle();
    expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/conta/seguranca" });
  });
});

describe("account deletion and social posts", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.userId.mockResolvedValue("user-1");
    mocks.confirmIdentity.mockResolvedValue("ok");
    mocks.assets.mockResolvedValue([]);
    mocks.postCount.mockResolvedValue(0);
    mocks.influencerCount.mockResolvedValue(0);
    mocks.accounts.mockResolvedValue([]);
    mocks.deleteMany.mockResolvedValue({ count: 1 });
    mocks.disconnect.mockResolvedValue({ canceled: 0 });
  });

  it("refuses while a post is being published and leaves the accounts connected", async () => {
    mocks.postCount.mockResolvedValue(1);
    expect(await deleteAccount({ error: "" }, form())).toEqual({ error: "Aguarde a publicação em andamento terminar." });
    expect(mocks.disconnect).not.toHaveBeenCalled();
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });

  it("guards the delete itself against a post that starts publishing a moment later", async () => {
    mocks.deleteMany.mockResolvedValue({ count: 0 });
    mocks.postCount.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    const result = await deleteAccount({ error: "" }, form());
    expect(result).toEqual({ error: "Aguarde a publicação em andamento terminar." });
    expect(mocks.deleteMany.mock.calls[0][0].where.socialPosts).toEqual({ none: { status: "PUBLISHING" } });
  });

  it("disconnects every connected account before the cascade, ignoring their errors", async () => {
    mocks.accounts.mockResolvedValue([{ id: "a1" }, { id: "a2" }]);
    mocks.disconnect.mockRejectedValueOnce(new Error("provider down")).mockResolvedValueOnce({ canceled: 1 });
    await deleteAccount({ error: "" }, form());
    expect(mocks.accounts.mock.calls[0][0].where).toEqual({ userId: "user-1", status: { not: "DISCONNECTED" } });
    expect(mocks.disconnect).toHaveBeenCalledWith("user-1", "a1");
    expect(mocks.disconnect).toHaveBeenCalledWith("user-1", "a2");
    expect(mocks.deleteMany).toHaveBeenCalledTimes(1);
    expect(mocks.signOut).toHaveBeenCalled();
  });
});
