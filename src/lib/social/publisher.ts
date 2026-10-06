import type { NetworkId } from "./networks";
import { mockEnabled } from "../provider";
import { MockPublisher } from "./mock";

export type Backend = "x" | "bundle" | "mock";
export type TokenSet = { accessToken: string; refreshToken: string | null; expiresAt: Date | null; scopes?: string };
export type ConnectedAccount = { network: NetworkId; providerAccountId: string; handle: string; displayName?: string; avatarUrl?: string; tokens: TokenSet | null };
export type AccountRef = { id: string; network: NetworkId; providerAccountId: string; handle: string; accessToken: string | null }; // accessToken already opened and fresh
export type MediaRef = { kind: "IMAGE" | "VIDEO"; contentType: string; fileName: string; publicUrl: string; read(): Promise<Uint8Array> };
export type FailureReason = "auth_expired" | "media_rejected" | "text_rejected" | "rate_limited" | "platform_error";
export type PublishOutcome =
  | { state: "published"; providerPostId: string; url: string | null }
  | { state: "scheduled"; providerPostId: string }
  | { state: "failed"; reason: FailureReason }
  | { state: "unknown" };
export type PublishInput = { account: AccountRef; text: string; media: MediaRef | null; aiLabel: boolean; scheduledAt: Date | null; operationKey: string };

export interface Publisher {
  backend: Backend;
  startConnect(input: { userId: string; redirectUri: string }): Promise<{ url: string; secret: string | null }>;
  finishConnect(input: { userId: string; redirectUri: string; params: URLSearchParams; secret: string | null }): Promise<ConnectedAccount[]>;
  refresh?(refreshToken: string): Promise<TokenSet>;
  publish(input: PublishInput): Promise<PublishOutcome>;
  status(input: { account: AccountRef; providerPostId: string }): Promise<PublishOutcome>;
  cancel?(input: { account: AccountRef; providerPostId: string }): Promise<void>;
  disconnect(input: { account: AccountRef }): Promise<void>;
}

export class AuthExpiredError extends Error {}

// Tasks 5 and 9 replace the "x" and "bundle" throws with their adapters.
export function getPublisher(backend: Backend): Publisher {
  if (backend === "mock" || mockEnabled()) return new MockPublisher();
  throw new Error("Backend unavailable");
}

export function connectBackend(backend: "x" | "bundle"): Backend {
  return mockEnabled() ? "mock" : backend;
}

export function backendReady(backend: "x" | "bundle"): boolean {
  if (mockEnabled()) return true;
  const env = process.env;
  return backend === "x"
    ? Boolean(env.X_CLIENT_ID && env.X_CLIENT_SECRET && env.SOCIAL_TOKEN_KEY)
    : Boolean(env.BUNDLE_API_KEY);
}
