import { prisma } from "@/lib/prisma";
import { providerMediaUrl } from "@/lib/media-access";
import { readReference } from "@/lib/reference-storage";
import { SocialError } from "./errors";
import type { MediaRef } from "./publisher";

export async function assetMedia(userId: string, assetId: string): Promise<MediaRef> {
  const asset = await prisma.asset.findFirst({ where: { id: assetId, userId } });
  if (!asset) throw new SocialError("Mídia não encontrada.");
  if (asset.kind !== "IMAGE" && asset.kind !== "VIDEO") throw new SocialError("Só é possível publicar imagens e vídeos.");
  const kind = asset.kind;
  return {
    kind,
    contentType: asset.contentType ?? (kind === "IMAGE" ? "image/jpeg" : "video/mp4"),
    fileName: asset.fileName ?? asset.id,
    publicUrl: providerMediaUrl(asset),
    async read() {
      if (asset.storageKey) return readReference(asset.storageKey);
      const res = await fetch(asset.url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error("Media unavailable");
      return new Uint8Array(await res.arrayBuffer());
    },
  };
}
