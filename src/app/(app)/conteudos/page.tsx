import Link from "next/link";
import { PageHeading } from "@/components/app/page-heading";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { contentStatusLabels, dateLabel } from "@/lib/platform";
import type { ContentStatus } from "@/generated/prisma/client";
export default async function ContentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
    archive?: string;
    influencer?: string;
  }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  const q = String(params.q ?? "")
    .trim()
    .slice(0, 120);
  const status = Object.hasOwn(contentStatusLabels, params.status ?? "")
    ? (params.status as ContentStatus)
    : undefined;
  const archived = params.archive === "1";
  const influencer = params.influencer;
  const where = {
    influencer: { userId },
    archivedAt: archived ? { not: null } : null,
    ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
    ...(status ? { status } : {}),
    ...(influencer ? { influencerId: influencer } : {}),
  };
  const [count, characters] = await Promise.all([
    prisma.content.count({ where }),
    prisma.influencer.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(count / 24));
  const requested = Number(params.page);
  const page =
    Number.isSafeInteger(requested) && requested > 0
      ? Math.min(requested, pages)
      : 1;
  const items = await prisma.content.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * 24,
    take: 24,
    include: {
      influencer: { select: { name: true } },
      _count: {
        select: { steps: { where: { status: { in: ["DONE", "APPROVED"] } } } },
      },
    },
  });
  const href = (p: number, a = archived) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (status) query.set("status", status);
    if (influencer) query.set("influencer", influencer);
    if (a) query.set("archive", "1");
    if (p > 1) query.set("page", String(p));
    return `/conteudos${query.size ? `?${query}` : ""}`;
  };
  const selectClass =
    "min-h-11 max-w-full rounded-control border border-lab-border bg-lab-surface-2 px-3 text-body-sm";
  return (
    <div className="mx-auto max-w-content">
      <PageHeading
        title="Seus conteúdos"
        description="Organize ideias, acompanhe produções e volte aos seus vídeos."
        action={
          <Link
            href="/conteudos/novo"
            className={buttonVariants({ size: "lg" })}
          >
            Criar conteúdo
          </Link>
        }
      />
      <nav aria-label="Organização dos conteúdos" className="mb-5 flex gap-2">
        <Link
          href={href(1, false)}
          aria-current={!archived ? "page" : undefined}
          className={buttonVariants({
            variant: !archived ? "secondary" : "ghost",
          })}
        >
          Ativos
        </Link>
        <Link
          href={href(1, true)}
          aria-current={archived ? "page" : undefined}
          className={buttonVariants({
            variant: archived ? "secondary" : "ghost",
          })}
        >
          Arquivados
        </Link>
      </nav>
      <form className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        {archived && <input type="hidden" name="archive" value="1" />}
        <Input
          name="q"
          aria-label="Buscar conteúdo pelo título"
          placeholder="Buscar pelo título"
          defaultValue={q}
          className="min-w-0"
        />
        <select
          name="status"
          aria-label="Filtrar por status"
          defaultValue={status ?? ""}
          className={selectClass}
        >
          <option value="">Todos os status</option>
          {Object.entries(contentStatusLabels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          name="influencer"
          aria-label="Filtrar por personagem"
          defaultValue={influencer ?? ""}
          className={selectClass}
        >
          <option value="">Todos os personagens</option>
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          className={buttonVariants({ variant: "secondary", size: "lg" })}
        >
          Filtrar
        </button>
      </form>
      <p className="mb-4 text-body-sm text-lab-text-muted">
        {count} {count === 1 ? "conteúdo" : "conteúdos"}{pages > 1 ? ` · Página ${page} de ${pages}` : ""}
      </p>
      {items.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/i/${item.influencerId}/c/${item.id}`}
                className="rounded-lab border border-lab-border bg-lab-surface-1 p-5 hover:border-lab-border-strong"
              >
                <span className="rounded-control bg-lab-surface-2 px-2 py-1 text-caption">
                  {archived ? "Arquivado" : contentStatusLabels[item.status]}
                </span>
                <h2 className="mt-4 break-words font-display text-xl">
                  {item.title}
                </h2>
                <p className="mt-2 text-body-sm text-lab-text-dim">
                  {item.influencer.name} · {item.aspectRatio}
                </p>
                <p className="mt-4 text-caption text-lab-text-muted">
                  {item._count.steps} {item._count.steps === 1 ? "etapa concluída" : "etapas concluídas"} ·{" "}
                  {dateLabel(item.updatedAt)}
                </p>
              </Link>
            ))}
          </div>
          <nav
            aria-label="Páginas de conteúdos"
            className="mt-6 flex justify-between gap-3"
          >
            {page > 1 ? (
              <Link
                href={href(page - 1)}
                className={buttonVariants({ variant: "secondary", size: "lg" })}
              >
                Anterior
              </Link>
            ) : (
              <span />
            )}
            {page < pages && (
              <Link
                href={href(page + 1)}
                className={buttonVariants({ variant: "secondary", size: "lg" })}
              >
                Próxima
              </Link>
            )}
          </nav>
        </>
      ) : (
        <EmptyState
          title={
            archived
              ? "Nenhum conteúdo arquivado"
              : "Nenhum conteúdo encontrado"
          }
          description={
            archived
              ? "Os conteúdos que você arquivar aparecerão aqui e poderão ser restaurados."
              : "Crie uma nova ideia ou ajuste os filtros para encontrar sua produção."
          }
          action={
            <Link
              href={q || status || influencer ? (archived ? "/conteudos?archive=1" : "/conteudos") : "/conteudos/novo"}
              className={buttonVariants({ size: "lg" })}
            >
              {q || status || influencer ? "Limpar filtros" : "Criar conteúdo"}
            </Link>
          }
        />
      )}
    </div>
  );
}
