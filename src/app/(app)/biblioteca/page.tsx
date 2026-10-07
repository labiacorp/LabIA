import { UploadReference } from "./upload-reference";
import { referenceStorageReady, localReferenceStorage } from "@/lib/reference-storage";
import { PageHeading } from "@/components/app/page-heading";
import { isOwner } from "@/lib/owner";
import { loadLibrary } from "@/lib/library-data";
import { parseLibraryFilters, type LibraryParams } from "@/lib/library";
import { requireUserId } from "@/lib/session";
import { LibraryView } from "./library-view";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<LibraryParams>;
}) {
  const userId = await requireUserId();
  const filters = parseLibraryFilters(await searchParams);
  const data = await loadLibrary(userId, filters, await isOwner());
  return (
    <div className="mx-auto max-w-content">
      <PageHeading
        title="Biblioteca"
        description="Seus arquivos e referências, prontos para encontrar e reutilizar."
      />
      <details className="mb-6 rounded-lab border border-lab-border bg-lab-surface-1 p-4"><summary className="cursor-pointer text-body-sm font-medium">Importar imagem ou vídeo</summary><div className="mt-4"><UploadReference ready={referenceStorageReady()} local={localReferenceStorage()} /></div></details>
      <LibraryView {...data} filters={{ ...filters, page: data.page }} />
    </div>
  );
}
