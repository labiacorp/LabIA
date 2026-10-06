"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  Download,
  ExternalLink,
  X,
  ImageIcon,
  Film,
  Music,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { CostChip } from "@/components/ui/cost-chip";
import {
  libraryHref,
  DEFAULT_LIBRARY_FILTERS,
  type LibraryFilters,
} from "@/lib/library";
import { dateLabel } from "@/lib/platform";
import { costText } from "@/lib/plan";
import type { LibraryAsset } from "@/lib/library-data";

function MediaPreview({
  asset,
}: {
  asset: { kind: string; url: string; title: string };
}) {
  if (asset.kind === "AUDIO")
    return (
      <div className="grid min-h-40 content-center gap-5 p-4">
        <Music className="mx-auto size-8 text-lab-text-dim" />
        <audio
          aria-label={asset.title}
          controls
          preload="metadata"
          src={asset.url}
          className="w-full"
        />
      </div>
    );
  if (asset.kind === "VIDEO")
    return (
      <video
        aria-label={asset.title}
        controls
        preload="metadata"
        src={asset.url}
        className="max-h-[50dvh] w-full bg-lab-bg object-contain"
      />
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={asset.title}
      src={asset.url}
      loading="lazy"
      className="max-h-[50dvh] w-full bg-lab-bg object-contain"
    />
  );
}

export function DownloadAsset({ id }: { id: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <Button
        size="lg"
        variant="secondary"
        loading={pending}
        onClick={async () => {
          setPending(true);
          setError("");
          try {
            const response = await fetch(`/api/assets/${id}/download`);
            if (!response.ok) {
              setError(
                response.status === 401
                  ? "Sua sessão expirou. Entre novamente para baixar o arquivo."
                  : response.status === 404
                    ? "Este arquivo não está disponível para sua conta."
                    : "Não foi possível baixar o arquivo agora. Tente novamente.",
              );
              return;
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download =
              /filename="([^"]+)"/.exec(
                response.headers.get("content-disposition") ?? "",
              )?.[1] ?? "labia";
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 10000);
          } catch {
            setError(
              "Não foi possível baixar o arquivo. Confira sua conexão e tente novamente.",
            );
          } finally {
            setPending(false);
          }
        }}
      >
        <Download className="size-4" />
        Baixar arquivo
      </Button>
      {error ? (
        <p role="alert" className="mt-2 max-w-sm text-caption text-lab-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function LibraryView({
  assets,
  influencers,
  total,
  pages,
  page,
  filters,
}: {
  assets: LibraryAsset[];
  influencers: { id: string; name: string }[];
  total: number;
  pages: number;
  page: number;
  filters: LibraryFilters;
}) {
  const [selected, setSelected] = useState<LibraryAsset | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const filtered = libraryHref(filters, { page: 1 }) !== "/biblioteca";
  return (
    <>
      <div className="library-toolbar"><nav aria-label="Tipos de arquivo" className="library-type-tabs">{([{kind:"all",label:"Todos"},{kind:"IMAGE",label:"Imagens"},{kind:"VIDEO",label:"Vídeos"},{kind:"AUDIO",label:"Áudios"}] as const).map(item => <Link key={item.kind} href={libraryHref(filters,{kind:item.kind,page:1})} aria-current={filters.kind === item.kind ? "page" : undefined}>{item.label}</Link>)}</nav><form action="/biblioteca" className="library-search"><input type="hidden" name="kind" value={filters.kind} /><input type="hidden" name="influencer" value={filters.influencer} /><input type="hidden" name="role" value={filters.role} /><input type="hidden" name="period" value={filters.period} /><Input name="q" aria-label="Buscar na biblioteca" placeholder="Buscar arquivos…" defaultValue={filters.q} /><Button variant="secondary" aria-label="Buscar arquivos">Buscar</Button></form></div>
      <details
        className="mb-6 rounded-lab border border-lab-border bg-lab-surface-1"
      >
        <summary className="cursor-pointer p-4 text-body-sm font-medium">
          Filtros da biblioteca{filtered ? " · ativos" : ""}
        </summary>
        <form
          action="/biblioteca"
          className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <label className="grid gap-2 text-caption">
            Buscar
            <Input
              name="q"
              placeholder="Arquivo, personagem ou conteúdo"
              defaultValue={filters.q}
            />
          </label>
          <label className="grid gap-2 text-caption">
            Personagem
            <Select name="influencer" defaultValue={filters.influencer}>
              <option value="all">Todos os personagens</option>
              {influencers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-2 text-caption">
            Tipo
            <Select name="kind" defaultValue={filters.kind}>
              <option value="all">Todos os arquivos</option>
              <option value="IMAGE">Imagens</option>
              <option value="VIDEO">Vídeos</option>
              <option value="AUDIO">Áudios</option>
            </Select>
          </label>
          <label className="grid gap-2 text-caption">
            Uso
            <Select name="role" defaultValue={filters.role}>
              <option value="all">Qualquer uso</option>
              <option value="SHEET">Ficha</option>
              <option value="FRONT">Frente</option>
              <option value="PROFILE">Perfil</option>
              <option value="DETAIL">Detalhes</option>
              <option value="content">Conteúdo</option>
            </Select>
          </label>
          <label className="grid gap-2 text-caption">
            Período
            <Select name="period" defaultValue={filters.period}>
              <option value="all">Todo o período</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
            </Select>
          </label>
          <div className="flex items-end gap-2">
            <Button size="lg">Filtrar</Button>
            {filtered ? (
              <Link
                href="/biblioteca"
                className={buttonVariants({ variant: "ghost", size: "lg" })}
              >
                Limpar
              </Link>
            ) : null}
          </div>
        </form>
      </details>
      <p className="mb-4 text-body-sm text-lab-text-dim">{total} {total === 1 ? "arquivo" : "arquivos"}</p>
      {assets.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => {
            const Icon =
              asset.kind === "IMAGE"
                ? ImageIcon
                : asset.kind === "VIDEO"
                  ? Film
                  : Music;
            return (
              <article
                key={asset.id}
                className="overflow-hidden rounded-lab border border-lab-border bg-lab-surface-1"
              >
                {asset.kind === "IMAGE" ? <button type="button" className="library-image-preview" aria-label={`Abrir ${asset.title}`} onClick={() => {setSelected(asset);dialog.current?.showModal();}}><MediaPreview asset={asset} /></button> : <div className="library-media-preview"><MediaPreview asset={asset} /></div>}
                <div className="grid gap-3 p-4">
                  <div className="flex items-start gap-2">
                    <Icon className="mt-1 size-4 shrink-0 text-lab-text-dim" />
                    <div className="min-w-0">
                      <h2 className="break-words font-medium">{asset.title}</h2>
                      <p className="mt-1 text-caption text-lab-text-dim">
                        {asset.influencer?.name ?? "Arquivo da conta"}
                      </p>
                    </div>
                  </div>
                  <CostChip
                    state={
                      asset.actualCost !== null
                        ? "actual"
                        : asset.estimatedCost !== null
                          ? "estimated"
                          : "unavailable"
                    }
                    value={asset.actualCost ?? asset.estimatedCost ?? undefined}
                    prefix="etapa"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelected(asset);
                      dialog.current?.showModal();
                    }}
                  >
                    Abrir arquivo
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={
            filtered
              ? "Nenhum arquivo neste filtro"
              : "Sua biblioteca começa com a primeira geração"
          }
          description={
            filtered
              ? "Ajuste os filtros para encontrar o arquivo que procura."
              : "Fichas, retratos, cenas e vídeos ficam reunidos aqui quando estiverem prontos."
          }
          action={
            <Link
              href={
                filtered
                  ? libraryHref(DEFAULT_LIBRARY_FILTERS)
                  : "/influenciadores"
              }
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              {filtered ? "Limpar filtros" : "Ver personagens"}
            </Link>
          }
        />
      )}
      {pages > 1 ? (
        <nav
          aria-label="Páginas da biblioteca"
          className="mt-6 flex flex-wrap items-center justify-between gap-3"
        >
          {page > 1 ? (
            <Link
              href={libraryHref(filters, { page: page - 1 })}
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-caption">
            Página {page} de {pages}
          </span>
          {page < pages ? (
            <Link
              href={libraryHref(filters, { page: page + 1 })}
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              Próxima
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
      <dialog
        ref={dialog}
        className="studio-dialog"
        aria-labelledby="asset-title"
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <>
            <div className="studio-dialog-header">
              <h2 id="asset-title" className="break-words font-display text-lg">
                {selected.title}
              </h2>
              <button
                aria-label="Fechar detalhes"
                className="lab-hit-target shrink-0"
                onClick={() => dialog.current?.close()}
              >
                <X className="mx-auto size-5" />
              </button>
            </div>
            <MediaPreview asset={selected} />
            <div className="studio-dialog-details">
              <dl className="grid gap-3 text-body-sm">
                <div>
                  <dt className="text-lab-text-muted">Origem</dt>
                  <dd>
                    {selected.influencer?.name ?? "Conta"} ·{" "}
                    {selected.modelLabel}
                  </dd>
                </div>
                <div>
                  <dt className="text-lab-text-muted">Criado em</dt>
                  <dd>{dateLabel(new Date(selected.createdAt))}</dd>
                </div>
                <div>
                  <dt className="text-lab-text-muted">Custo da etapa</dt>
                  <dd>
                    {selected.actualCost !== null
                      ? costText(selected.actualCost)
                      : selected.estimatedCost !== null
                        ? `~${costText(selected.estimatedCost)}`
                        : "Ainda não apurado"}
                  </dd>
                  <p className="mt-1 text-caption text-lab-text-dim">
                    O custo pertence à etapa inteira e pode incluir outros
                    arquivos.
                  </p>
                </div>
                {selected.width && selected.height ? (
                  <div>
                    <dt className="text-lab-text-muted">Dimensões</dt>
                    <dd>
                      {selected.width} × {selected.height}
                    </dd>
                  </div>
                ) : null}
                {selected.duration !== null ? (
                  <div>
                    <dt className="text-lab-text-muted">Duração</dt>
                    <dd>{selected.duration.toLocaleString("pt-BR")}s</dd>
                  </div>
                ) : null}
                {selected.prompt ? (
                  <div>
                    <dt className="text-lab-text-muted">Direção utilizada</dt>
                    <dd className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-control bg-lab-surface-2 p-3 text-caption">
                      {selected.prompt}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <div className="flex flex-wrap gap-3">
                <DownloadAsset id={selected.id} />
                {selected.url.startsWith("https://") ||
                selected.url.startsWith("/mock/") ? (
                  <a
                    href={selected.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: "ghost", size: "lg" })}
                  >
                    <ExternalLink className="size-4" />
                    Abrir original
                  </a>
                ) : null}
                {selected.content ? (
                  <Link
                    href={`/i/${selected.content.influencerId}/c/${selected.content.id}`}
                    className={buttonVariants({ variant: "ghost", size: "lg" })}
                  >
                    Abrir produção
                  </Link>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </dialog>
    </>
  );
}
