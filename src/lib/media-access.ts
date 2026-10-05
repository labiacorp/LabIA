import { createHmac, timingSafeEqual } from "node:crypto";
export function mediaSignature(id: string, expires: number) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw Error("Media signing unavailable");
  return createHmac("sha256", secret)
    .update(`media:${id}:${expires}`)
    .digest("hex");
}
export function validMediaSignature(
  id: string,
  expires: string | null,
  signature: string | null,
) {
  if (
    !expires ||
    !signature ||
    !/^\d+$/.test(expires) ||
    !Number.isSafeInteger(Number(expires)) ||
    Number(expires) < Date.now() ||
    Number(expires) > Date.now() + 3600000 ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    return false;
  try {
    return timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(mediaSignature(id, Number(expires)), "hex"),
    );
  } catch {
    return false;
  }
}
export function providerMediaUrl(asset: {
  id: string;
  url: string;
  storageKey: string | null;
}) {
  if (!asset.storageKey) return asset.url;
  const origin = new URL(
    process.env.LABIA_PUBLIC_URL || "http://localhost:3000",
  );
  if (process.env.NODE_ENV === "production" && origin.protocol !== "https:")
    throw Error("Public HTTPS origin required");
  const expires = Date.now() + 3600000;
  return `${origin.origin}/api/assets/${asset.id}/file?expires=${expires}&signature=${mediaSignature(asset.id, expires)}`;
}
