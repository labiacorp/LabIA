import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { cookieSecret } from "@/lib/auth/invite-cookie";

// Shared access code in front of every account page (sign in, sign up, recovery request).
// It keeps strangers off the auth forms while the product is in private beta. It is NOT a replacement
// for membership checks: an account without a workspace is still refused by the API (middleware 403).
//
// The pass is a signed cookie that embeds a fingerprint of the current code, so rotating
// LABIA_ACCESS_CODE invalidates every pass that was issued before.
export const ACCESS_COOKIE = "labia_access";
export const ACCESS_TTL_SECONDS = 14 * 24 * 60 * 60;

// Paths that sit behind the gate. Email links (/criar-conta/confirmar, /redefinir-senha/confirmar) and the
// OAuth return (/auth/callback) are deliberately NOT here: they open in a different browser or app, carry
// their own single-use token, and gating them would break confirmation on a second device.
const GATED_PATHS = new Set(["/entrar", "/criar-conta", "/criar-conta/codigo", "/criar-conta/reenviar", "/esqueci-a-senha"]);
export const isGatedPath = (pathname: string) => GATED_PATHS.has(pathname);

export type GateMode = "off" | "on" | "closed";

// off: local development with no code set. closed: production (or a half-configured gate) with no way to
// pass, so a missing variable locks the forms instead of opening them.
export function gateMode(): GateMode {
  const code = process.env.LABIA_ACCESS_CODE?.trim();
  if (code && cookieSecret()) return "on";
  return process.env.NODE_ENV === "production" || code ? "closed" : "off";
}

const sha256 = (value: string) => createHash("sha256").update(value).digest();
const fingerprint = (code: string) => sha256(code).toString("hex").slice(0, 16);
const sign = (message: string, key: string) => createHmac("sha256", key).update(message).digest("base64url");

export function codeMatches(input: string) {
  const code = process.env.LABIA_ACCESS_CODE?.trim();
  if (!code || !input) return false;
  return timingSafeEqual(sha256(input.trim()), sha256(code));
}

export function signAccessPass(now = Date.now()) {
  const key = cookieSecret();
  const code = process.env.LABIA_ACCESS_CODE?.trim();
  if (!key || !code) throw new Error("LABIA_ACCESS_CODE and LABIA_COOKIE_SECRET (32+ chars) must both be set.");
  const exp = now + ACCESS_TTL_SECONDS * 1000;
  return `${exp}.${sign(`access.${exp}.${fingerprint(code)}`, key)}`;
}

export function hasAccessPass(value: string | undefined, now = Date.now()) {
  const mode = gateMode();
  if (mode === "off") return true;
  if (mode === "closed" || !value) return false;
  const key = cookieSecret();
  const code = process.env.LABIA_ACCESS_CODE?.trim();
  if (!key || !code) return false;
  const [expRaw, signature, extra] = value.split(".");
  const exp = Number(expRaw);
  if (!signature || extra !== undefined || !Number.isFinite(exp) || exp < now) return false;
  const expected = Buffer.from(sign(`access.${exp}.${fingerprint(code)}`, key));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
