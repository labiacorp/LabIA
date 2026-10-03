"use client";

import { CostChip } from "@/components/ui/cost-chip";
import type { LibraryAsset } from "@/components/library/library-view";
import { cn } from "@/lib/utils";

export function dateLabel(date: string, full = false) {
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", ...(full ? { hour: "2-digit", minute: "2-digit" } : {}) }).format(new Date(date));
}

export function AssetCost({ asset, detail = false }: { asset: LibraryAsset; detail?: boolean }) {
  return <CostChip state={asset.origin === "UPLOADED" ? "free" : asset.actualCost == null ? "pending" : "actual"} value={asset.actualCost ?? undefined} size={detail ? "md" : "sm"} className="border-0 bg-transparent px-0" />;
}

export function AssetMedia({ asset, detail = false }: { asset: LibraryAsset; detail?: boolean }) {
  return asset.type === "VIDEO" ? <video src={asset.url} controls preload="metadata" aria-label={asset.prompt || "Vídeo do projeto"} className={cn("h-full w-full bg-lab-bg object-cover", detail && "object-contain")} /> :
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={asset.url} alt={asset.prompt || asset.originalFileName || "Imagem do projeto"} loading="lazy" className={cn("h-full w-full object-cover", detail && "object-contain")} />;
}

export function AssetCard({ asset, selected, onOpen }: { asset: LibraryAsset; selected: boolean; onOpen: (asset: LibraryAsset) => void }) {
  return (
    <article className={cn("min-w-0 overflow-hidden rounded-node border bg-lab-surface-1", selected ? "border-lab-reagent ring-1 ring-lab-reagent" : "border-lab-border")}>
      <div className="relative aspect-square bg-lab-surface-2">
        {asset.type === "IMAGE" ? <button type="button" className="size-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lab-reagent" aria-label={`Ver detalhe: ${asset.modelLabel}`} onClick={() => onOpen(asset)}><AssetMedia asset={asset} /></button> : <AssetMedia asset={asset} />}
        {asset.width && asset.height ? <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-lab-bg/85 px-1.5 py-0.5 font-mono text-caption text-lab-text-dim">{asset.width}×{asset.height}</span> : null}
      </div>
      <button type="button" onClick={() => onOpen(asset)} aria-label={`Abrir detalhes de ${asset.modelLabel}`} className="w-full space-y-1 p-2.5 text-left focus-visible:outline-none focus-visible:shadow-lab-focus sm:px-3">
        <span className="flex min-w-0 flex-col gap-1 xl:flex-row xl:justify-between"><span className="truncate text-caption font-medium sm:text-body-sm">{asset.modelLabel}</span><AssetCost asset={asset} /></span>
        <span className="hidden truncate text-caption text-lab-text-dim sm:block">{asset.project?.name ?? "Sem projeto"} · {dateLabel(asset.createdAt)}</span>
      </button>
    </article>
  );
}
