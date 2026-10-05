import { readFile } from "node:fs/promises";
import path from "node:path";

import { auth } from "@/auth";
import { downloadFilename, downloadSource } from "@/lib/media-download";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json(
      { error: "Entre novamente para baixar o arquivo." },
      { status: 401 },
    );
  const { id } = await params;
  const asset = await prisma.asset.findFirst({
    where: { id, userId: session.user.id },
    include: {
      influencer: { select: { name: true } },
      content: { select: { title: true } },
    },
  });
  if (!asset)
    return Response.json({ error: "Arquivo não encontrado." }, { status: 404 });
  if (asset.storageKey) return Response.redirect(new URL(`/api/assets/${asset.id}/file?download=1`, _request.url));
  const source = downloadSource(
    asset.url,
    process.env.NODE_ENV === "development" && process.env.FAL_MOCK === "1",
  );
  if (!source)
    return Response.json(
      {
        error:
          "O download desta origem ainda não está disponível. Use Abrir original.",
      },
      { status: 422 },
    );

  try {
    let body: BodyInit | null;
    let contentType: string;
    if ("mockFile" in source) {
      body = new Uint8Array(
        await readFile(
          path.join(process.cwd(), "public", "mock", source.mockFile),
        ),
      );
      contentType = source.mockFile.endsWith(".svg")
        ? "image/svg+xml"
        : "video/mp4";
    } else {
      // Never follow an unchecked redirect into another host or the local network.
      const upstream = await fetch(source.url, {
        redirect: "manual",
        signal: AbortSignal.timeout(60000),
        cache: "no-store",
      });
      if (!upstream.ok || !upstream.body)
        return Response.json(
          {
            error:
              "O arquivo não respondeu. Tente novamente ou abra o original.",
          },
          { status: 502 },
        );
      body = upstream.body;
      contentType = upstream.headers.get("content-type") ?? "";
    }
    const filename = downloadFilename(
      asset.content?.title ?? asset.influencer?.name ?? "labia",
      asset.id,
      contentType,
    );
    const expectedPrefix = {
      IMAGE: "image/",
      VIDEO: "video/",
      AUDIO: "audio/",
    }[asset.kind];
    if (!filename || !contentType.toLowerCase().startsWith(expectedPrefix))
      return Response.json(
        { error: "O arquivo recebido tem um formato inesperado." },
        { status: 502 },
      );
    return new Response(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json(
      {
        error:
          "Não foi possível baixar agora. Tente novamente ou abra o original.",
      },
      { status: 502 },
    );
  }
}
