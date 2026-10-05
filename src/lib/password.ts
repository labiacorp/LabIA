import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export const PASSWORD_MIN = 4;
export const PASSWORD_MAX = 128;

// scrypt N=2^16, r=8 (about 64 MB, OWASP-level). Stored as scrypt$N$salt$hash so the cost can be raised later.
const N = 2 ** 16;
const derive = (password: string, salt: Buffer, n: number) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, 32, { N: n, r: 8, p: 1, maxmem: 130 * 8 * n }, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  return `scrypt$${N}$${salt.toString("base64url")}$${(await derive(password, salt, N)).toString("base64url")}`;
}

const DUMMY = hashPassword("dummy-password-for-timing");

// A missing user or hash still pays for one derivation, so response time does not reveal which e-mails exist.
export async function verifyPassword(password: string, stored?: string | null) {
  const [scheme, n, salt, hash] = (stored ?? (await DUMMY)).split("$");
  if (scheme !== "scrypt" || !n || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = await derive(password, Buffer.from(salt, "base64url"), Number(n));
  return stored != null && actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function passwordError(password: string) {
  if (password.length < PASSWORD_MIN) return `Use pelo menos ${PASSWORD_MIN} caracteres na senha.`;
  if (password.length > PASSWORD_MAX) return `Use no máximo ${PASSWORD_MAX} caracteres na senha.`;
  return null;
}
