import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  MAX_REFERENCE_BYTES,
  ReferenceInputError,
  validateReference,
} from "@/lib/reference-input";
import {
  referenceStorageReady,
  storeReference,
  removeReference,
} from "@/lib/reference-storage";
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json(
      { error: "Entre novamente para importar." },
      { status: 401 },
    );
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    return Response.json({ error: "Origem inválida." }, { status: 403 });
  if (!referenceStorageReady())
    return Response.json(
      { error: "O armazenamento de referências ainda não está configurado." },
      { status: 503 },
    );
  let storageKey: string | undefined;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new ReferenceInputError("Escolha um arquivo.");
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > MAX_REFERENCE_BYTES) {
        await reader.cancel();
        throw new ReferenceInputError("Use um arquivo de até 4 MB.");
      }
      chunks.push(chunk.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const data = await validateReference(
      bytes,
      request.headers.get("content-type") ?? "",
    );
    const id = randomUUID();
    storageKey = await storeReference(
      `references/${id}.${data.extension}`,
      data.bytes,
      data.contentType,
    );
    const rawName = request.headers.get("x-file-name") ?? "Referência";
    const fileName =
      decodeURIComponent(rawName)
        .replace(/[\x00-\x1f/\\]/g, "_")
        .slice(0, 120) || "Referência";
    const asset = await prisma.asset.create({
      data: {
        id,
        userId: session.user.id,
        kind: data.kind,
        url: `/api/assets/${id}/file`,
        storageKey,
        contentType: data.contentType,
        fileName,
        sizeBytes: data.bytes.length,
        width: data.width,
        height: data.height,
        durationSec: data.durationSec,
      },
    });
    return Response.json(
      { id: asset.id, url: asset.url, kind: asset.kind },
      { status: 201 },
    );
  } catch (error) {
    if (storageKey) await removeReference(storageKey).catch(() => {});
    return Response.json(
      {
        error:
          error instanceof ReferenceInputError
            ? error.message
            : "Não conseguimos importar o arquivo. Tente novamente.",
      },
      { status: error instanceof ReferenceInputError ? 400 : 503 },
    );
  }
}
