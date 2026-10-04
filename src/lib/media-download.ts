const MOCK_FILES = new Set([
  "portrait.svg",
  "sheet.svg",
  "clip.mp4",
  "reel.mp4",
]);

// Fetch only provider-controlled hosts; redirects are checked separately.
export function downloadSource(
  value: string,
  allowMock = false,
): { url: URL } | { mockFile: string } | null {
  if (allowMock && value.startsWith("/mock/")) {
    const file = value.split("?")[0].slice("/mock/".length);
    return MOCK_FILES.has(file) ? { mockFile: file } : null;
  }
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    )
      return null;
    const host = url.hostname;
    if (
      host === "fal.media" ||
      host.endsWith(".fal.media") ||
      host.endsWith(".blob.vercel-storage.com")
    )
      return { url };
  } catch {
    /* Malformed URLs are not fetched. */
  }
  return null;
}

export function downloadFilename(
  title: string,
  id: string,
  contentType: string,
) {
  const type = contentType.split(";")[0].trim().toLowerCase();
  const extension = (
    {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/svg+xml": "svg",
      "video/mp4": "mp4",
      "video/webm": "webm",
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
      "audio/x-wav": "wav",
      "audio/mp4": "m4a",
      "audio/ogg": "ogg",
    } as Record<string, string>
  )[type];
  if (!extension) return null;
  const name =
    title
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "labia";
  return `${name}-${id.replace(/[^a-z0-9]/gi, "").slice(-8)}.${extension}`;
}
