import { PageHeading } from "@/components/app/page-heading";
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
  const data = await loadLibrary(userId, filters);
  return (
    <div className="mx-auto max-w-content">
      <PageHeading
        title="Biblioteca"
        description="Imagens, clipes e vídeos finais dos seus personagens, com origem e custo da etapa."
      />
      <LibraryView {...data} filters={{ ...filters, page: data.page }} />
    </div>
  );
}
