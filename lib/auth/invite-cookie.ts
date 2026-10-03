import { createHmac, timingSafeEqual } from "node:crypto";

// Leva o convite e o aceite dos Termos através do redirecionamento do Google (o callback é um GET vindo de fora).
// Assinado para que ninguém fabrique um "aceite"; o convite em si continua conferido no banco no retorno.
export const GOOGLE_SIGNUP_COOKIE = "labia_cadastro_google";
export const GOOGLE_SIGNUP_COOKIE_TTL_SECONDS = 15 * 60;

export type GoogleSignupClaim = { invite: string | null; exp: number };

export function cookieSecret() {
  const value = process.env.LABIA_COOKIE_SECRET?.trim();
  return value && value.length >= 32 ? value : null;
}

export const isCookieSecretConfigured = () => cookieSecret() !== null;

const sign = (body: string, key: string) => createHmac("sha256", key).update(body).digest("base64url");

export function signGoogleSignupClaim(invite: string | null, now = Date.now()) {
  const key = cookieSecret();
  if (!key) throw new Error("LABIA_COOKIE_SECRET não configurada (32+ caracteres).");
  const claim: GoogleSignupClaim = { invite, exp: now + GOOGLE_SIGNUP_COOKIE_TTL_SECONDS * 1000 };
  const body = Buffer.from(JSON.stringify(claim)).toString("base64url");
  return `${body}.${sign(body, key)}`;
}

export function readGoogleSignupClaim(value: string | undefined, now = Date.now()): GoogleSignupClaim | null {
  const key = cookieSecret();
  if (!key || !value) return null;
  const [body, signature, extra] = value.split(".");
  if (!body || !signature || extra !== undefined) return null;
  const expected = Buffer.from(sign(body, key));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const claim = JSON.parse(Buffer.from(body, "base64url").toString()) as GoogleSignupClaim;
    if (typeof claim.exp !== "number" || claim.exp < now) return null;
    if (claim.invite !== null && typeof claim.invite !== "string") return null;
    return claim;
  } catch {
    return null;
  }
}
