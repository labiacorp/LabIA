// Server-only: uses node:crypto. Never import from a client component.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";

function key(): Buffer {
  const k = Buffer.from(process.env.SOCIAL_TOKEN_KEY ?? "", "base64");
  if (k.length !== 32) throw new Error("SOCIAL_TOKEN_KEY must be 32 bytes, base64-encoded");
  return k;
}

// AES-256-GCM; the AAD binds the ciphertext to its row. Format: v1:<iv>:<tag>:<ciphertext>, base64url.
export function sealToken(plain: string, aad: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(aad));
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(":");
}

export function openToken(sealed: string, aad: string): string {
  try {
    const [version, iv, tag, body, ...rest] = sealed.split(":");
    if (version !== VERSION || !iv || !tag || body === undefined || rest.length) throw new Error();
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    decipher.setAAD(Buffer.from(aad));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("Token unavailable");
  }
}
