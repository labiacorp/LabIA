import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findFirst: vi.fn(),
  upsert: vi.fn(),
  flowRunFindUnique: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: () => {} }) }));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getUser: mocks.getUser } }) }));
vi.mock("@/lib/db/default-workspace", () => ({
  ensureDefaultWorkspace: async () => ({ id: "ws-felipe", name: "Felipe Zilli" }),
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    workspaceMember: { findFirst: mocks.findFirst, upsert: mocks.upsert },
    flowRun: { findUnique: mocks.flowRunFindUnique },
  },
}));

import { safeNextPath } from "@/lib/auth/next-path";
import { getSessionPrincipal } from "@/lib/auth/session";
import { getOwnedExecutionScope, runAsFlowRunJob } from "@/lib/flows/ownership";

const felipeMembership = { role: "OWNER", workspace: { id: "ws-felipe", name: "Felipe Zilli" } };

describe("10-contas A1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    process.env.LABIA_BOOTSTRAP_OWNER_EMAIL = "Felipe@Exemplo.com";
    process.env.LABIA_LOCAL_OWNER_ID = "felipe-local";
    mocks.findFirst.mockResolvedValue(null);
  });

  it("next só aceita caminho interno", () => {
    expect(safeNextPath("/projetos?id=1")).toBe("/projetos?id=1");
    expect(safeNextPath("https://exemplo.com")).toBe("/fluxos");
    expect(safeNextPath("//exemplo.com")).toBe("/fluxos");
    expect(safeNextPath("/\\exemplo.com")).toBe("/fluxos");
    expect(safeNextPath(null)).toBe("/fluxos");
  });

  it("bootstrap: e-mail do Felipe confirmado vira owner e mantém o dono local das conexões", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "u-felipe", email: "felipe@exemplo.com", email_confirmed_at: "2026-10-02", user_metadata: {} } },
    });
    mocks.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(felipeMembership);

    const principal = await getSessionPrincipal();

    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: { workspaceId: "ws-felipe", userId: "u-felipe", role: "OWNER" },
    }));
    expect(principal?.workspace?.id).toBe("ws-felipe");
    expect(principal?.ownerId).toBe("felipe-local");
  });

  it("bootstrap: mesmo e-mail sem confirmação não herda o workspace", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "u-intruso", email: "felipe@exemplo.com", email_confirmed_at: null, user_metadata: {} } },
    });

    const principal = await getSessionPrincipal();

    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(principal?.workspace).toBeNull();
    expect(principal?.ownerId).toBe("u-intruso");
  });

  it("sem sessão o escopo recusa com 401", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    await expect(getOwnedExecutionScope()).rejects.toMatchObject({ status: 401 });
  });

  it("worker usa o workspace gravado no FlowRun, sem sessão", async () => {
    mocks.flowRunFindUnique.mockResolvedValue({ workspaceId: "ws-b" });

    const scope = await runAsFlowRunJob("run-1", "u-outro", () => getOwnedExecutionScope());

    expect(scope).toEqual({ workspaceId: "ws-b", ownerId: "u-outro" });
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
});
