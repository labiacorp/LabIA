import { createHash, randomBytes } from "node:crypto";
import { AuthExpiredError } from "./publisher";
import type { AccountRef, ConnectedAccount, FailureReason, MediaRef, PublishInput, PublishOutcome, Publisher, TokenSet } from "./publisher";

const API = "https://api.x.com/2";
const AUTHORIZE = "https://x.com/i/oauth2/authorize";
const SCOPES = "tweet.read tweet.write users.read media.write offline.access";
const CHUNK = 5 * 1024 * 1024;
const MAX_PROCESSING_SECS = 120;
const TIMEOUT_MS = 20_000;

class UploadFailure extends Error {
  constructor(public reason: FailureReason) {
    super("X media upload failed: " + reason);
  }
}

type XBody = {
  error?: unknown;
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  scope?: unknown;
  media_id_string?: unknown;
  data?: {
    id?: unknown;
    username?: unknown;
    name?: unknown;
    profile_image_url?: unknown;
    media_id_string?: unknown;
    processing_info?: { state?: unknown; check_after_secs?: unknown };
  };
};

const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);

const b64url = (buf: Buffer) => buf.toString("base64url");

function basicAuth(): string {
  const id = process.env.X_CLIENT_ID ?? "";
  const secret = process.env.X_CLIENT_SECRET ?? "";
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

function request(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
}

async function readJson(res: Response): Promise<XBody> {
  try {
    return (await res.json()) as XBody;
  } catch {
    return {};
  }
}

async function tokenRequest(params: Record<string, string>): Promise<TokenSet> {
  const res = await request(`${API}/oauth2/token`, {
    method: "POST",
    headers: { Authorization: basicAuth(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const body = await readJson(res);
  if (!res.ok) {
    if (res.status === 400 && body.error === "invalid_grant") throw new AuthExpiredError("X authorization expired");
    throw new Error(`X token request failed (${res.status})`);
  }
  if (typeof body.access_token !== "string") throw new Error("X token response invalid");
  return {
    accessToken: body.access_token,
    refreshToken: typeof body.refresh_token === "string" ? body.refresh_token : null,
    expiresAt: typeof body.expires_in === "number" ? new Date(Date.now() + body.expires_in * 1000) : null,
    scopes: typeof body.scope === "string" ? body.scope : undefined,
  };
}

function bearer(account: AccountRef): Record<string, string> {
  return { Authorization: `Bearer ${account.accessToken ?? ""}` };
}

function uploadFailureFor(status: number): FailureReason {
  if (status === 401) return "auth_expired";
  if (status === 429) return "rate_limited";
  return "platform_error";
}

async function uploadCall(account: AccountRef, path: string, init: RequestInit): Promise<XBody> {
  let res: Response;
  try {
    res = await request(`${API}${path}`, { ...init, headers: { ...bearer(account), ...(init.headers as Record<string, string> | undefined) } });
  } catch {
    throw new UploadFailure("platform_error");
  }
  if (!res.ok) throw new UploadFailure(uploadFailureFor(res.status));
  return readJson(res);
}

const mediaId = (body: XBody): string => {
  const id = str(body.data?.id) ?? str(body.data?.media_id_string) ?? str(body.media_id_string);
  if (!id) throw new UploadFailure("platform_error");
  return id;
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function uploadImage(account: AccountRef, media: MediaRef): Promise<string> {
  const bytes = await media.read();
  const form = new FormData();
  form.append("media", new Blob([bytes as BlobPart], { type: media.contentType }), media.fileName);
  form.append("media_category", "tweet_image");
  return mediaId(await uploadCall(account, "/media/upload", { method: "POST", body: form }));
}

async function uploadVideo(account: AccountRef, media: MediaRef): Promise<string> {
  const bytes = await media.read();
  const init = await uploadCall(account, "/media/upload/initialize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ media_type: media.contentType, total_bytes: bytes.byteLength, media_category: "tweet_video" }),
  });
  const id = mediaId(init);
  for (let i = 0, offset = 0; offset < bytes.byteLength; i++, offset += CHUNK) {
    const form = new FormData();
    form.append("segment_index", String(i));
    form.append("media", new Blob([bytes.slice(offset, offset + CHUNK) as BlobPart], { type: media.contentType }), media.fileName);
    await uploadCall(account, `/media/upload/${id}/append`, { method: "POST", body: form });
  }
  const fin = await uploadCall(account, `/media/upload/${id}/finalize`, { method: "POST" });
  let info = fin.data?.processing_info;
  let waited = 0;
  while (info && info.state !== "succeeded") {
    if (info.state === "failed") throw new UploadFailure("media_rejected");
    const wait = Number(info.check_after_secs) > 0 ? Number(info.check_after_secs) : 2;
    if (waited + wait > MAX_PROCESSING_SECS) throw new UploadFailure("platform_error");
    await sleep(wait * 1000);
    waited += wait;
    const status = await uploadCall(account, `/media/upload?command=STATUS&media_id=${encodeURIComponent(id)}`, { method: "GET" });
    info = status.data?.processing_info;
    if (!info) throw new UploadFailure("platform_error");
  }
  return id;
}

export class XPublisher implements Publisher {
  backend = "x" as const;

  async startConnect({ redirectUri }: { userId: string; redirectUri: string }) {
    const state = b64url(randomBytes(24));
    const verifier = b64url(randomBytes(64));
    const challenge = b64url(createHash("sha256").update(verifier).digest());
    const url = new URL(AUTHORIZE);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", process.env.X_CLIENT_ID ?? "");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", SCOPES);
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    return { url: url.toString(), secret: JSON.stringify({ state, verifier }) };
  }

  async finishConnect({ redirectUri, params, secret }: { userId: string; redirectUri: string; params: URLSearchParams; secret: string | null }): Promise<ConnectedAccount[]> {
    let saved: { state?: unknown; verifier?: unknown } = {};
    try {
      saved = JSON.parse(secret ?? "");
    } catch {
      // handled below
    }
    const state = params.get("state");
    const code = params.get("code");
    if (typeof saved.state !== "string" || typeof saved.verifier !== "string" || !state || state !== saved.state) throw new Error("X connect state mismatch");
    if (!code) throw new Error("X connect missing code");
    const tokens = await tokenRequest({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: saved.verifier,
      client_id: process.env.X_CLIENT_ID ?? "",
    });
    const res = await request(`${API}/users/me?user.fields=profile_image_url`, { headers: { Authorization: `Bearer ${tokens.accessToken}` } });
    if (!res.ok) throw new Error(`X profile request failed (${res.status})`);
    const me = (await readJson(res)).data;
    const id = str(me?.id);
    const handle = str(me?.username);
    if (!id || !handle) throw new Error("X profile response invalid");
    return [{ network: "X", providerAccountId: id, handle, displayName: str(me?.name), avatarUrl: str(me?.profile_image_url), tokens }];
  }

  refresh(refreshToken: string): Promise<TokenSet> {
    return tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: process.env.X_CLIENT_ID ?? "" });
  }

  async publish(input: PublishInput): Promise<PublishOutcome> {
    const { account, media } = input;
    let ids: string[] | null = null;
    try {
      if (media) ids = [media.kind === "VIDEO" ? await uploadVideo(account, media) : await uploadImage(account, media)];
    } catch (e) {
      return { state: "failed", reason: e instanceof UploadFailure ? e.reason : "platform_error" };
    }
    const body: Record<string, unknown> = { text: input.text };
    if (ids) body.media = { media_ids: ids };
    if (input.aiLabel) body.made_with_ai = true;
    let res: Response;
    try {
      res = await request(`${API}/tweets`, {
        method: "POST",
        headers: { ...bearer(account), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      return { state: "unknown" };
    }
    if (res.status === 401) return { state: "failed", reason: "auth_expired" };
    if (res.status === 429) return { state: "failed", reason: "rate_limited" };
    if (res.status === 403 || res.status === 400) return { state: "failed", reason: "text_rejected" };
    if (res.status === 408 || res.status >= 500) return { state: "unknown" };
    if (!res.ok) return { state: "failed", reason: "platform_error" };
    const id = str((await readJson(res)).data?.id);
    if (!id) return { state: "unknown" };
    return { state: "published", providerPostId: id, url: `https://x.com/${account.handle}/status/${id}` };
  }

  async status({ account, providerPostId }: { account: AccountRef; providerPostId: string }): Promise<PublishOutcome> {
    // X publishes immediately; a stored post id means it was published.
    return { state: "published", providerPostId, url: `https://x.com/${account.handle}/status/${providerPostId}` };
  }

  async disconnect({ account }: { account: AccountRef }): Promise<void> {
    if (!account.accessToken) return;
    try {
      await request(`${API}/oauth2/revoke`, {
        method: "POST",
        headers: { Authorization: basicAuth(), "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: account.accessToken, token_type_hint: "access_token", client_id: process.env.X_CLIENT_ID ?? "" }).toString(),
      });
    } catch {
      // Best effort: the user can also revoke at x.com/settings/connected_apps.
    }
  }
}
