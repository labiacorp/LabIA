import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Shared access code in front of sign-in while the product is in closed beta (ported from the V1 gate).
// The pass is a signed cookie that embeds a fingerprint of the current code, so rotating
// LABIA_ACCESS_CODE invalidates every pass issued before. Key: AUTH_SECRET, domain-separated by the "access." prefix.
export const ACCESS_COOKIE = "labia_access";
export const ACCESS_TTL_SECONDS = 14 * 24 * 60 * 60;

export type GateMode = "off" | "on" | "closed";

const secret = () => {
  const value = process.env.AUTH_SECRET?.trim();
  return value && value.length >= 32 ? value : null;
};
const code = () => process.env.LABIA_ACCESS_CODE?.trim() || null;

// off: local development with no code set. closed: production (or a half-configured gate) with no way
// to pass, so a missing variable locks the form instead of opening it.
export function gateMode(): GateMode {
  if (code() && secret()) return "on";
  // ponytail: no code set means the beta is open (any production deploy included); a code without a secret stays closed.
  return code() ? "closed" : "off";
}

const sha256 = (value: string) => createHash("sha256").update(value).digest();
const fingerprint = (value: string) => sha256(value).toString("hex").slice(0, 16);
const sign = (message: string, key: string) => createHmac("sha256", key).update(message).digest("base64url");

export function codeMatches(input: string) {
  const expected = code();
  if (!expected || !input) return false;
  return timingSafeEqual(sha256(input.trim()), sha256(expected));
}

export function signAccessPass(now = Date.now()) {
  const key = secret();
  const current = code();
  if (!key || !current) throw new Error("LABIA_ACCESS_CODE and AUTH_SECRET (32+ chars) must both be set.");
  const exp = now + ACCESS_TTL_SECONDS * 1000;
  return `${exp}.${sign(`access.${exp}.${fingerprint(current)}`, key)}`;
}

export function hasAccessPass(value: string | undefined, now = Date.now()) {
  const mode = gateMode();
  if (mode === "off") return true;
  if (mode === "closed" || !value) return false;
  const key = secret();
  const current = code();
  if (!key || !current) return false;
  const [expRaw, signature, extra] = value.split(".");
  const exp = Number(expRaw);
  if (!signature || extra !== undefined || !Number.isFinite(exp) || exp < now) return false;
  const expected = Buffer.from(sign(`access.${exp}.${fingerprint(current)}`, key));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export const hasPass = async () => hasAccessPass((await cookies()).get(ACCESS_COOKIE)?.value);

export async function grantPass() {
  (await cookies()).set(ACCESS_COOKIE, signAccessPass(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACCESS_TTL_SECONDS,
  });
}
