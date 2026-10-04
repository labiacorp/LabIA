import sharp from "sharp";
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export async function normalizeProfilePhoto(file: File) {
  if (file.size === 0 || file.size > MAX_AVATAR_BYTES)
    throw new Error("Escolha uma foto de até 5 MB.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Use uma foto JPG, PNG ou WebP.");
  const bytes = Buffer.from(await file.arrayBuffer());
  try {
    const metadata = await sharp(bytes, {
      limitInputPixels: 36_000_000,
    }).metadata();
    if (
      !["jpeg", "png", "webp"].includes(metadata.format ?? "") ||
      (metadata.pages ?? 1) > 1
    )
      throw new Error("format");
    // Re-encoding strips metadata and keeps a bounded private thumbnail, not a source upload.
    return await sharp(bytes, { limitInputPixels: 36_000_000 })
      .rotate()
      .resize(256, 256, { fit: "cover" })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw new Error(
      "Não conseguimos ler esta foto. Use um JPG, PNG ou WebP estático de até 36 megapixels.",
    );
  }
}
