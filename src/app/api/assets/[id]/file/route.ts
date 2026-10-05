import { validMediaSignature } from "@/lib/media-access";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readReference } from "@/lib/reference-storage";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const signed = validMediaSignature(
    id,
    url.searchParams.get("expires"),
    url.searchParams.get("signature"),
  );
  const session = signed ? null : await auth();
  if (!signed && !session?.user?.id) return new Response(null, { status: 401 });
  const asset = await prisma.asset.findFirst({
    where: { id, ...(!signed ? { userId: session!.user.id } : {}) },
  });
  if (!asset?.storageKey || !asset.contentType)
    return new Response(null, { status: 404 });
  try {
    const bytes = await readReference(asset.storageKey);
    const headers: Record<string, string> = {
      "Content-Type": asset.contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "bytes",
    };
    if (new URL(request.url).searchParams.has("download"))
      headers["Content-Disposition"] =
        `attachment; filename="labia-${asset.id}.${asset.kind === "VIDEO" ? "mp4" : "webp"}"`;
    const range = request.headers.get("range");
    if (range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(range);
      const start = Number(match?.[1]);
      const end = match?.[2]
        ? Math.min(Number(match[2]), bytes.length - 1)
        : bytes.length - 1;
      if (
        !match ||
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start > end ||
        start >= bytes.length
      )
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${bytes.length}` },
        });
      return new Response(bytes.slice(start, end + 1), {
        status: 206,
        headers: {
          ...headers,
          "Content-Range": `bytes ${start}-${end}/${bytes.length}`,
          "Content-Length": String(end - start + 1),
        },
      });
    }
    return new Response(new Uint8Array(bytes), {
      headers: { ...headers, "Content-Length": String(bytes.length) },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
