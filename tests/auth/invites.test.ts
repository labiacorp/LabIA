import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = vi.hoisted(() => ({
  invite: { updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
  workspace: { create: vi.fn() },
  workspaceMember: { findFirst: vi.fn(), upsert: vi.fn() },
  profile: { upsert: vi.fn() },
}));
const inviteFindFirst = vi.hoisted(() => vi.fn());
const inviteFindUnique = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ getSessionPrincipal: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    invite: { findFirst: inviteFindFirst, findUnique: inviteFindUnique },
    $transaction: (run: (client: typeof tx) => Promise<unknown>) => run(tx),
  },
}));

import { findOpenInvite, getInviteState, hashInviteToken, InviteTakenError, provisionAccount } from "@/lib/auth/invites";
import { requiresSpend } from "@/lib/flows/costs";
import { zeroCost } from "@/lib/flows/types";

describe("10-contas A2: convites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.invite.updateMany.mockResolvedValue({ count: 1 });
    tx.workspace.create.mockResolvedValue({ id: "ws-novo" });
    tx.workspaceMember.findFirst.mockResolvedValue(null);
  });

  it("procura só pelo hash, sem uso e dentro do prazo; token adulterado ou ausente não consulta nada", async () => {
    await findOpenInvite("token-puro");
    const where = inviteFindFirst.mock.calls[0][0].where;
    expect(where.tokenHash).toBe(hashInviteToken("token-puro"));
    expect(where.tokenHash).not.toContain("token-puro");
    expect(where.usedAt).toBeNull();
    expect(where.expiresAt.gt).toBeInstanceOf(Date);

    expect(await findOpenInvite(undefined)).toBeNull();
    expect(await findOpenInvite(["a"])).toBeNull();
    expect(inviteFindFirst).toHaveBeenCalledTimes(1);
  });

  it("segundo uso do mesmo convite é recusado e não cria membro", async () => {
    tx.invite.updateMany.mockResolvedValue({ count: 0 });

    await expect(provisionAccount({ inviteId: "inv", userId: "u1", name: "Ana" })).rejects.toBeInstanceOf(InviteTakenError);
    expect(tx.workspaceMember.upsert).not.toHaveBeenCalled();
    expect(tx.profile.upsert).not.toHaveBeenCalled();
  });

  it("convite sem workspace cria um workspace novo (sem gasto) e a pessoa é owner", async () => {
    tx.invite.findUniqueOrThrow.mockResolvedValue({ id: "inv", workspaceId: null });

    await provisionAccount({ inviteId: "inv", userId: "u1", name: "Ana" });

    const created = tx.workspace.create.mock.calls[0][0].data;
    expect(created.name).toBe("Workspace de Ana");
    expect(created).not.toHaveProperty("spendEnabled");
    expect(tx.workspaceMember.upsert.mock.calls[0][0].create).toEqual({ workspaceId: "ws-novo", userId: "u1", role: "OWNER" });
    expect(tx.profile.upsert.mock.calls[0][0].create).toMatchObject({ userId: "u1", consentVersion: expect.any(String) });
  });

  it("convite para workspace existente entra como member, sem criar workspace", async () => {
    tx.invite.findUniqueOrThrow.mockResolvedValue({ id: "inv", workspaceId: "ws-felipe" });

    await provisionAccount({ inviteId: "inv", userId: "u2", name: "Diego" });

    expect(tx.workspace.create).not.toHaveBeenCalled();
    expect(tx.workspaceMember.upsert.mock.calls[0][0].create).toEqual({ workspaceId: "ws-felipe", userId: "u2", role: "MEMBER" });
  });

  it("estado do convite: aberto, usado, vencido ou inexistente", async () => {
    const future = new Date(Date.now() + 60_000);
    const past = new Date(Date.now() - 60_000);
    inviteFindUnique.mockResolvedValueOnce(null);
    expect((await getInviteState("x")).status).toBe("invalid");
    inviteFindUnique.mockResolvedValueOnce({ usedAt: past, expiresAt: future });
    expect((await getInviteState("x")).status).toBe("used");
    inviteFindUnique.mockResolvedValueOnce({ usedAt: null, expiresAt: past });
    expect((await getInviteState("x")).status).toBe("expired");
    inviteFindUnique.mockResolvedValueOnce({ usedAt: null, expiresAt: future });
    expect((await getInviteState("x")).status).toBe("open");
    expect((await getInviteState(undefined)).status).toBe("invalid");
  });

  it("quem já tem workspace não gasta convite nem ganha outro", async () => {
    tx.workspaceMember.findFirst.mockResolvedValue({ id: "m" });

    await provisionAccount({ inviteId: "inv", userId: "u1", name: "Ana" });

    expect(tx.invite.updateMany).not.toHaveBeenCalled();
    expect(tx.workspace.create).not.toHaveBeenCalled();
    expect(tx.workspaceMember.upsert).not.toHaveBeenCalled();
  });

  it("cadastro aberto (sem convite): workspace próprio, owner, sem gasto", async () => {
    await provisionAccount({ inviteId: null, userId: "u3", name: "Caio" });

    expect(tx.invite.updateMany).not.toHaveBeenCalled();
    expect(tx.workspace.create.mock.calls[0][0].data).not.toHaveProperty("spendEnabled");
    expect(tx.workspaceMember.upsert.mock.calls[0][0].create).toEqual({ workspaceId: "ws-novo", userId: "u3", role: "OWNER" });
    expect(tx.profile.upsert).toHaveBeenCalled();
  });

  it("gasto: só o que é local e grátis roda sem spendEnabled", () => {
    expect(requiresSpend(zeroCost)).toBe(false);
    expect(requiresSpend({ ...zeroCost, billingMode: "api" })).toBe(true);
    expect(requiresSpend({ ...zeroCost, billingMode: "subscription" })).toBe(true);
    expect(requiresSpend({ ...zeroCost, usd: 0.04, brl: 0.22 })).toBe(true);
  });
});
