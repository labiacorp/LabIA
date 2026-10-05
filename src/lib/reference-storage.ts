import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { put, get, del } from "@vercel/blob";
import { mockEnabled } from "@/lib/provider";

// Local fixtures are explicit dev/test behavior, never a production fallback.
export const localReferenceStorage = () => mockEnabled();
export const referenceStorageReady = () =>
  localReferenceStorage() ||
  Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.BLOB_STORE_ID && process.env.VERCEL),
  );
const root = () => path.join(process.cwd(), ".handoff", "reference-uploads");
const safeKey = (key: string) => {
  if (!/^references\/[a-zA-Z0-9_-]+\.(webp|mp4)$/.test(key))
    throw new Error("Invalid storage key");
  return key;
};
export async function storeReference(
  key: string,
  bytes: Uint8Array,
  contentType: string,
) {
  safeKey(key);
  if (localReferenceStorage()) {
    await mkdir(path.join(root(), "references"), { recursive: true });
    await writeFile(path.join(root(), key), bytes, { flag: "wx" });
    return `local:${key}`;
  }
  if (!referenceStorageReady()) throw new Error("Storage unavailable");
  const result = await put(key, Buffer.from(bytes), {
    access: "private",
    contentType,
    addRandomSuffix: false,
  });
  return `blob:${result.pathname}`;
}
export async function readReference(storageKey: string): Promise<Uint8Array> {
  const [backend, ...parts] = storageKey.split(":");
  const key = safeKey(parts.join(":"));
  if (backend === "local" && localReferenceStorage())
    return new Uint8Array(await readFile(path.join(root(), key)));
  if (backend !== "blob") throw new Error("Storage unavailable");
  const result = await get(key, { access: "private", useCache: false });
  if (result?.statusCode !== 200) throw new Error("File unavailable");
  return new Uint8Array(await new Response(result.stream).arrayBuffer());
}
export async function removeReference(storageKey: string) {
  const [backend, ...parts] = storageKey.split(":");
  const key = safeKey(parts.join(":"));
  if (backend === "local" && localReferenceStorage())
    await unlink(path.join(root(), key));
  else if (backend === "blob") await del(key);
}
