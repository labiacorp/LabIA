/*
 * bundle.social adapter. Docs read on 2026-10-06 from https://info.bundle.social (llms.txt and the pages below).
 * Nothing here was exercised against the real API (no key yet); tests stub fetch against these shapes.
 *
 * Base URL   https://api.bundle.social, every path under /api/v1. Auth: header `x-api-key: <BUNDLE_API_KEY>`.
 * Errors     401 missing key, 403 invalid key / forbidden, 429 rate limited, 400 validation, 5xx server.
 *
 * Team       POST /team/ {name (3-80 chars), avatarUrl?} -> {id, name, ...}. One team per LabIA user, id kept in
 *            SocialTenant(userId, backend "bundle", externalId).
 *            GET /team/{id} -> {..., socialAccounts: [{id, type, username, displayName, avatarUrl, externalId,
 *            providerPageId, channels, deletedAt, ...}]}.
 * Connect    POST /social-account/create-portal-link {teamId, socialAccountTypes[], redirectUrl, language,
 *            expiresIn (minutes, 5-2880, default 10), logoUrl?, ...} -> {url}. Languages include "pt".
 *            The user returns to redirectUrl with callback query params (e.g. `<network>-callback`, or an error
 *            such as `not-enough-permissions`); we do not depend on them: finishConnect just lists the team.
 * Account    DELETE /social-account/disconnect {type, teamId} (also removes the account from scheduled posts).
 * Upload     POST /upload/from-url {url, teamId?} -> {id, type: image|video|document, ...}.
 * Post       POST /post/ {teamId, title (min 1), postDate (ISO), status DRAFT|SCHEDULED, socialAccountTypes[],
 *            referenceKey? (max 128), data: {<TYPE>: {...}}} -> {id, status, postDate, postedDate, externalData,
 *            error, errors, errorsVerbose}. status: DRAFT SCHEDULED POSTED ERROR DELETED PROCESSING REVIEW RETRYING.
 *            Per-type data used: INSTAGRAM {type POST|REEL, text, uploadIds, isAiGenerated}; TIKTOK {type VIDEO,
 *            text, uploadIds, isAiGenerated}; LINKEDIN {text, uploadIds}; THREADS {text, uploadIds}; YOUTUBE {type
 *            VIDEO, text, description, uploadIds, containsSyntheticMedia}; FACEBOOK {type POST|REEL, text, uploadIds}.
 *            GET /post/{id} -> same object; externalData[<TYPE>] = {id, permalink, ...}.
 *            DELETE /post/{id}: deleting a scheduled post cancels it; a published post stays on the network.
 * Webhook    POST to our endpoint, body {type: "post.published", data: <post object>}; data.status "POSTED" on
 *            success, "ERROR" on failure (details in data.error / errors / errorsVerbose). Header `x-signature`:
 *            HMAC-SHA256 of the raw body with the Signing Secret (BUNDLE_WEBHOOK_SECRET). 15 s timeout, 3 attempts.
 *
 * UNCONFIRMED (isolated in the helpers named; correct here when the first real call is made):
 *  - signature encoding (hex vs base64, any "sha256=" prefix): verifyBundleSignature accepts all of them.
 *  - TikTok `privacy` and YouTube `privacy` required values: omitted (their defaults apply); see networkData().
 *  - AI-disclosure fields exist only for INSTAGRAM, TIKTOK (isAiGenerated) and YOUTUBE (containsSyntheticMedia);
 *    none was found for LINKEDIN, THREADS and FACEBOOK, so aiLabel is ignored there.
 *  - the logoUrl: the app has no icon.png, so it is omitted.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { NetworkId } from "./networks";
import { AuthExpiredError } from "./publisher";
import type { AccountRef, ConnectedAccount, FailureReason, PublishInput, PublishOutcome, Publisher } from "./publisher";

const API = "https://api.bundle.social/api/v1";
const TIMEOUT_MS = 30_000;
const PORTAL_MINUTES = 10;

// LabIA network -> bundle.social account type. X is served by our own backend, Bluesky is not offered yet.
const TYPE_OF: Partial<Record<NetworkId, string>> = {
  INSTAGRAM: "INSTAGRAM",
  TIKTOK: "TIKTOK",
  LINKEDIN: "LINKEDIN",
  THREADS: "THREADS",
  YOUTUBE: "YOUTUBE",
  FACEBOOK: "FACEBOOK",
};
const NETWORK_OF = new Map(Object.entries(TYPE_OF).map(([network, type]) => [type, network as NetworkId]));

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

class HttpError extends Error {
  constructor(public status: number) {
    super(`bundle.social request failed (${status})`);
  }
}

const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);

async function call(method: string, path: string, body?: unknown): Promise<Json> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "x-api-key": process.env.BUNDLE_API_KEY ?? "", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new HttpError(res.status);
  try {
    return (await res.json()) as Json;
  } catch {
    return {};
  }
}

function failureOf(error: unknown): FailureReason {
  if (error instanceof HttpError) {
    if (error.status === 401 || error.status === 403) return "auth_expired";
    if (error.status === 429) return "rate_limited";
  }
  return "platform_error";
}

// Account refs carry both ids we need: `${teamId}:${bundleAccountId}`.
const teamOf = (account: AccountRef) => account.providerAccountId.split(":")[0];

async function tenantTeam(userId: string): Promise<string> {
  const find = () => prisma.socialTenant.findUnique({ where: { userId_backend: { userId, backend: "bundle" } } });
  const existing = await find();
  if (existing) return existing.externalId;
  const team = await call("POST", "/team/", { name: `LabIA ${userId}`.slice(0, 80) });
  const id = str(team.id);
  if (!id) throw new Error("bundle.social team response invalid");
  try {
    await prisma.socialTenant.create({ data: { userId, backend: "bundle", externalId: id } });
    return id;
  } catch (error) {
    const winner = await find(); // lost a race with a parallel connect
    if (winner) return winner.externalId;
    throw error;
  }
}

function networkData(network: NetworkId, input: PublishInput, uploadIds: string[]): Json {
  const video = input.media?.kind === "VIDEO";
  const base = { text: input.text, ...(uploadIds.length ? { uploadIds } : {}) };
  switch (network) {
    case "INSTAGRAM":
      return { ...base, type: video ? "REEL" : "POST", ...(input.aiLabel ? { isAiGenerated: true } : {}) };
    case "TIKTOK":
      return { ...base, type: "VIDEO", ...(input.aiLabel ? { isAiGenerated: true } : {}) };
    case "YOUTUBE":
      return { ...base, type: "VIDEO", description: input.text, ...(input.aiLabel ? { containsSyntheticMedia: true } : {}) };
    case "FACEBOOK":
      return { ...base, type: video ? "REEL" : "POST" };
    default:
      return base; // LINKEDIN, THREADS
  }
}

function outcomeOfPost(post: Json, network: NetworkId): PublishOutcome {
  const id = str(post.id) ?? "";
  if (post.status === "POSTED") {
    const type = TYPE_OF[network] ?? "";
    return { state: "published", providerPostId: id, url: str(post.externalData?.[type]?.permalink) ?? null };
  }
  if (post.status === "ERROR") return { state: "failed", reason: "platform_error" };
  return { state: "scheduled", providerPostId: id };
}

export class BundlePublisher implements Publisher {
  backend = "bundle" as const;

  async startConnect({ userId, redirectUri }: { userId: string; redirectUri: string }) {
    const teamId = await tenantTeam(userId);
    const portal = await call("POST", "/social-account/create-portal-link", {
      teamId,
      socialAccountTypes: Object.values(TYPE_OF),
      redirectUrl: redirectUri,
      language: "pt",
      expiresIn: PORTAL_MINUTES,
    });
    const url = str(portal.url);
    if (!url) throw new Error("bundle.social portal response invalid");
    return { url, secret: null };
  }

  async finishConnect({ userId }: { userId: string; redirectUri: string; params: URLSearchParams; secret: string | null }): Promise<ConnectedAccount[]> {
    const tenant = await prisma.socialTenant.findUnique({ where: { userId_backend: { userId, backend: "bundle" } } });
    if (!tenant) throw new Error("No bundle.social team for this user");
    const team = await call("GET", `/team/${encodeURIComponent(tenant.externalId)}`);
    const list: Json[] = Array.isArray(team.socialAccounts) ? team.socialAccounts : [];
    const accounts: ConnectedAccount[] = [];
    for (const item of list) {
      const network = NETWORK_OF.get(String(item.type));
      const id = str(item.id);
      if (!network || !id || item.deletedAt) continue;
      accounts.push({
        network,
        providerAccountId: `${tenant.externalId}:${id}`,
        handle: str(item.username) ?? str(item.displayName) ?? id,
        displayName: str(item.displayName),
        avatarUrl: str(item.avatarUrl),
        tokens: null,
      });
    }
    return accounts;
  }

  async publish(input: PublishInput): Promise<PublishOutcome> {
    const type = TYPE_OF[input.account.network];
    if (!type) return { state: "failed", reason: "platform_error" };
    const teamId = teamOf(input.account);
    const uploadIds: string[] = [];
    try {
      if (input.media) {
        const upload = await call("POST", "/upload/from-url", { url: input.media.publicUrl, teamId });
        const id = str(upload.id);
        if (!id) throw new Error("bundle.social upload response invalid");
        uploadIds.push(id);
      }
    } catch (error) {
      // Nothing was created yet, so the post can safely fail and be refunded.
      return { state: "failed", reason: error instanceof HttpError && error.status === 400 ? "media_rejected" : failureOf(error) };
    }
    let post: Json;
    try {
      post = await call("POST", "/post/", {
        teamId,
        title: input.text.trim().slice(0, 80) || "LabIA",
        postDate: (input.scheduledAt ?? new Date()).toISOString(),
        status: "SCHEDULED",
        socialAccountTypes: [type],
        referenceKey: input.operationKey.slice(0, 128),
        data: { [type]: networkData(input.account.network, input, uploadIds) },
      });
    } catch (error) {
      // A rejected request created nothing; a network error or 5xx may have.
      if (error instanceof HttpError && error.status < 500) return { state: "failed", reason: failureOf(error) };
      return { state: "unknown" };
    }
    if (!str(post.id)) return { state: "unknown" };
    return outcomeOfPost(post, input.account.network);
  }

  async status({ account, providerPostId }: { account: AccountRef; providerPostId: string }): Promise<PublishOutcome> {
    const post = await call("GET", `/post/${encodeURIComponent(providerPostId)}`);
    return outcomeOfPost({ ...post, id: str(post.id) ?? providerPostId }, account.network);
  }

  async cancel({ providerPostId }: { account: AccountRef; providerPostId: string }): Promise<void> {
    await call("DELETE", `/post/${encodeURIComponent(providerPostId)}`);
  }

  async disconnect({ account }: { account: AccountRef }): Promise<void> {
    const type = TYPE_OF[account.network];
    if (!type) return;
    try {
      await call("DELETE", "/social-account/disconnect", { type, teamId: teamOf(account) });
    } catch (error) {
      if (error instanceof HttpError && (error.status === 401 || error.status === 403)) throw new AuthExpiredError("bundle.social key rejected");
      throw error;
    }
  }
}

// x-signature = HMAC-SHA256(rawBody, BUNDLE_WEBHOOK_SECRET). Encoding is UNCONFIRMED: hex, base64 and an optional
// "sha256=" prefix are all accepted.
export function verifyBundleSignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.BUNDLE_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const digest = createHmac("sha256", secret).update(rawBody).digest();
  const given = header.trim().replace(/^sha256=/i, "");
  return [digest.toString("hex"), digest.toString("base64")].some((expected) => {
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}
