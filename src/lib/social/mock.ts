import { randomUUID } from "node:crypto";
import type { AccountRef, ConnectedAccount, PublishInput, PublishOutcome, Publisher, TokenSet } from "./publisher";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function freshTokens(): TokenSet {
  return { accessToken: "mock-access", refreshToken: "mock-refresh", expiresAt: new Date(Date.now() + TWO_HOURS_MS) };
}

export class MockPublisher implements Publisher {
  backend = "mock" as const;

  async startConnect({ redirectUri }: { userId: string; redirectUri: string }) {
    const state = randomUUID();
    return { url: `${redirectUri}?code=mock&state=${state}`, secret: state };
  }

  async finishConnect({ userId, params, secret }: { userId: string; redirectUri: string; params: URLSearchParams; secret: string | null }): Promise<ConnectedAccount[]> {
    if (!secret || params.get("state") !== secret) throw new Error("State mismatch");
    return [{ network: "X", providerAccountId: `mock-${userId}`, handle: "labia_teste", tokens: freshTokens() }];
  }

  async refresh(_refreshToken: string): Promise<TokenSet> {
    return { accessToken: `mock-access-${randomUUID()}`, refreshToken: `mock-refresh-${randomUUID()}`, expiresAt: new Date(Date.now() + TWO_HOURS_MS) };
  }

  async publish({ text, scheduledAt, operationKey }: PublishInput): Promise<PublishOutcome> {
    if (text.includes("[mock-fail]")) return { state: "failed", reason: "platform_error" };
    if (text.includes("[mock-unknown]")) return { state: "unknown" };
    if (scheduledAt && scheduledAt.getTime() > Date.now()) return { state: "scheduled", providerPostId: `mock-sched-${operationKey}` };
    const id = `mock-${operationKey}`;
    return { state: "published", providerPostId: id, url: `https://example.com/mock/${id}` };
  }

  async status({ providerPostId }: { account: AccountRef; providerPostId: string }): Promise<PublishOutcome> {
    return { state: "published", providerPostId, url: `https://example.com/mock/${providerPostId}` };
  }

  async cancel(_input: { account: AccountRef; providerPostId: string }): Promise<void> {}

  async disconnect(_input: { account: AccountRef }): Promise<void> {}
}
