"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, Download, Image as ImageIcon, Search, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CostChip } from "@/components/ui/cost-chip";
import { AssetCard, AssetCost, AssetMedia, dateLabel } from "@/components/library/asset-card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export type LibraryAsset = {
  id: string;
  type: string;
  url: string;
  origin?: string;
  modelLabel: string;
  provider?: string | null;
  model?: string | null;
  prompt: string;
  originalFileName?: string | null;
  createdAt: string;
  width: number | null;
  height: number | null;
  project: { id: string; name: string } | null;
  actualCost: number | null;
  estimatedCost: number | null;
};
export type LibraryFilters = { project: string; type: string; provider: string; model: string; date: string };
export type FilterGroup = { key: "project" | "type" | "model" | "date"; label: string; options: { label: string; value: string; provider?: string | null; model?: string | null }[] };

export function libraryFilterHref(filters: LibraryFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value !== "all" && value) params.set(key, value);
  return params.size ? `/biblioteca?${params}` : "/biblioteca";
}

function optionSelected(filters: LibraryFilters, group: FilterGroup, option: FilterGroup["options"][number]) {
  return group.key === "model" ? filters.model === (option.model ?? "all") && filters.provider === (option.provider ?? "all") : filters[group.key] === option.value;
}

function withOption(filters: LibraryFilters, group: FilterGroup, option: FilterGroup["options"][number]): LibraryFilters {
  return group.key === "model" ? { ...filters, provider: option.provider ?? "all", model: option.model ?? "all" } : { ...filters, [group.key]: option.value };
}

const defaultFilters: LibraryFilters = { project: "all", type: "all", model: "all", provider: "all", date: "all" };

export function LibraryView({ assets, filters, groups }: { assets: LibraryAsset[]; filters: LibraryFilters; groups: FilterGroup[] }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<LibraryAsset | null>(null);
  const [draft, setDraft] = useState(filters);
  const filterDialog = useRef<HTMLDialogElement>(null);
  const detailDialog = useRef<HTMLDialogElement>(null);
  const visible = assets.filter((asset) => asset.prompt.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  const activeCount = groups.filter((group) => !optionSelected(filters, group, group.options[0])).length;
  const knownCosts = assets.filter((asset) => asset.origin !== "UPLOADED" && asset.actualCost !== null);
  const total = knownCosts.reduce((sum, asset) => sum + (asset.actualCost ?? 0), 0);
  const hasPendingCosts = assets.some((asset) => asset.origin !== "UPLOADED" && asset.actualCost === null);

  useEffect(() => { if (selected && window.matchMedia("(max-width: 1023px)").matches) detailDialog.current?.showModal(); }, [selected]);

  function closeDetail() {
    detailDialog.current?.close();
    setSelected(null);
  }

  function openFilters() {
    setDraft(filters);
    filterDialog.current?.showModal();
  }

  const detail = selected ? <>
    <div className="flex items-center justify-between"><span className="font-mono text-eyebrow uppercase text-lab-text-muted">Detalhe</span><Button variant="ghost" size="icon" aria-label="Fechar detalhe" onClick={closeDetail}><X /></Button></div>
    <div className="aspect-[9/12] max-h-[420px] overflow-hidden rounded-control bg-lab-surface-2"><AssetMedia asset={selected} detail /></div>
    <div className="flex items-center justify-between gap-3"><h2 className="min-w-0 font-display text-base font-medium">{selected.modelLabel}</h2><AssetCost asset={selected} detail /></div>
    <p className="rounded-control border border-lab-border bg-lab-surface-2 p-2.5 font-mono text-caption leading-[18px]">{selected.prompt || "Prompt não registrado."}</p>
    <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3.5 gap-y-2 text-xs">
      <dt className="text-lab-text-muted">Estimado</dt><dd><CostChip state={selected.origin === "UPLOADED" ? "free" : selected.estimatedCost == null ? "pending" : "estimated"} value={selected.estimatedCost ?? undefined} size="sm" className="border-0 bg-transparent px-0" /></dd>
      <dt className="text-lab-text-muted">Formato</dt><dd className="font-mono text-lab-text-dim">{selected.width && selected.height ? `${selected.width} × ${selected.height}` : selected.type === "VIDEO" ? "Vídeo" : "Imagem"}</dd>
      <dt className="text-lab-text-muted">{selected.origin === "UPLOADED" ? "Importado" : "Criado"}</dt><dd className="font-mono text-lab-text-dim">{dateLabel(selected.createdAt, true)}</dd>
    </dl>
    <div className="space-y-2 border-t border-lab-border pt-3"><p className="font-mono text-eyebrow uppercase text-lab-text-muted">Proveniência</p>{selected.project ? <Link href={`/projetos/${selected.project.id}`} className="flex items-center gap-2 text-[13px] hover:underline"><i className="size-1.5 rounded-sm bg-lab-info" />{selected.project.name}</Link> : <p className="text-[13px] text-lab-text-dim">Sem projeto</p>}<p className="text-xs text-lab-text-dim">{selected.origin === "UPLOADED" ? "Arquivo importado" : selected.origin === "GENERATED" ? "Resultado de geração" : "Origem não informada"}{selected.originalFileName ? ` · ${selected.originalFileName}` : ""}</p></div>
    <Button asChild variant="secondary" className="mt-auto"><a href={selected.url} target="_blank" rel="noreferrer" download={selected.originalFileName || undefined}><Download />Abrir arquivo<ArrowUpRight /></a></Button>
  </> : null;

  return <main className={cn("flex min-w-0 flex-1 flex-col lg:flex-row", !selected && "mx-auto w-full max-w-[1288px]")}>
    <div className="flex min-w-0 flex-1 flex-col gap-3.5 p-5 sm:gap-5 sm:px-8 sm:py-8 lg:pl-12">
      <div className="flex items-end justify-between gap-4"><div className="min-w-0"><h1 className="font-display text-[28px] font-bold tracking-[-0.02em] sm:text-[32px]">Biblioteca</h1><div className="mt-1.5 hidden items-center gap-1.5 text-sm text-lab-text-dim sm:flex"><span>{assets.length} {assets.length === 1 ? "item" : "itens"}{assets.length === 80 ? " recentes" : ""}</span>{knownCosts.length ? <><span>·</span><CostChip state="actual" value={total} className="border-0 bg-transparent px-0" /><span>em gerações{hasPendingCosts ? " com custo registrado" : ""}</span></> : null}</div></div><Button variant="secondary" size="lg" className="sm:hidden" onClick={openFilters}><SlidersHorizontal />Filtros{activeCount ? <span className="rounded-full bg-lab-border-strong px-1.5 font-mono text-caption">{activeCount}</span> : null}</Button><label className="hidden h-9 w-[260px] items-center gap-2 rounded-control border border-lab-border bg-lab-surface-1 px-3 sm:flex"><Search className="size-4 shrink-0 text-lab-text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Buscar no prompt" aria-label="Buscar no prompt" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-lab-text-muted" /></label></div>
      <div className="hidden flex-wrap items-center gap-2 sm:flex">
        {groups.map((group) => <details key={group.key} className="group relative"><summary className="flex h-[34px] cursor-pointer list-none items-center gap-2 rounded-control border border-lab-border bg-lab-surface-1 px-3 text-[13px] [&::-webkit-details-marker]:hidden"><span className="text-lab-text-muted">{group.label}</span><span className="max-w-[160px] truncate font-medium">{group.options.find((option) => optionSelected(filters, group, option))?.label ?? "Selecionado"}</span><ChevronDown className="size-3.5 text-lab-text-dim" /></summary><div className="absolute left-0 top-full z-10 mt-1 max-h-72 min-w-[200px] overflow-y-auto rounded-control border border-lab-border-strong bg-lab-surface-1 p-1 shadow-xl">{group.options.map((option) => <Link key={option.value} href={libraryFilterHref(withOption(filters, group, option))} aria-current={optionSelected(filters, group, option) ? "true" : undefined} className={cn("block rounded-control px-3 py-2 text-sm hover:bg-lab-surface-2", optionSelected(filters, group, option) ? "bg-lab-surface-2 text-lab-text" : "text-lab-text-dim")}>{option.label}</Link>)}</div></details>)}
        {activeCount ? <Link href="/biblioteca" className="ml-1 text-[13px] underline underline-offset-4">Limpar</Link> : null}
      </div>
      <p className="text-xs text-lab-text-dim sm:hidden">{groups.flatMap((group) => { const option = group.options.find((candidate) => optionSelected(filters, group, candidate)); return option && option !== group.options[0] ? [option.label] : []; }).concat(`${visible.length} itens`).join(" · ")}</p>
      <label className="flex h-11 items-center gap-2 rounded-control border border-lab-border bg-lab-surface-1 px-3 sm:hidden"><Search className="size-4 text-lab-text-muted" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar no prompt" aria-label="Buscar no prompt no celular" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-lab-text-muted" /></label>
      {visible.length ? <section aria-label="Arquivos da biblioteca" className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3", !selected && "lg:grid-cols-4", selected && "xl:grid-cols-4")}>
        {visible.map((asset) => <AssetCard key={asset.id} asset={asset} selected={selected?.id === asset.id} onOpen={setSelected} />)}
      </section> : <EmptyState icon={ImageIcon} title={activeCount || search ? "Nenhum arquivo com estes filtros" : "Nada gerado ainda"} description={activeCount || search ? "Tente outro período ou remova um filtro para encontrar seus arquivos." : "Tudo que você gerar ou importar aparece aqui, com prompt e custo real."} action={activeCount || search ? <Button asChild variant="secondary"><Link href="/biblioteca" onClick={() => setSearch("")}>Limpar filtros</Link></Button> : <Button asChild><Link href="/criar">Criar</Link></Button>} />}
    </div>
    {selected ? <aside aria-label="Detalhe do arquivo" className="hidden w-[400px] shrink-0 flex-col gap-4 border-l border-lab-border bg-lab-surface-1 p-5 lg:flex">{detail}</aside> : null}
    <dialog ref={detailDialog} onCancel={closeDetail} onClick={(event) => { if (event.target === event.currentTarget) closeDetail(); }} className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%-24px)] max-w-md overflow-y-auto rounded-node border border-lab-border-strong bg-lab-surface-1 p-5 text-lab-text backdrop:bg-lab-bg/80 lg:hidden" aria-label="Detalhe do arquivo"><div className="flex flex-col gap-4">{detail}</div></dialog>
    <dialog ref={filterDialog} aria-labelledby="library-filters-title" onClick={(event) => { if (event.target === event.currentTarget) filterDialog.current?.close(); }} className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[85dvh] w-full max-w-none rounded-t-2xl border-0 border-t border-lab-border-strong bg-lab-surface-1 p-0 text-lab-text backdrop:bg-lab-bg/80">
      <div className="flex justify-center p-2"><span className="h-1 w-9 rounded-full bg-lab-border-strong" /></div><div className="flex items-center justify-between px-5 pb-3"><h2 id="library-filters-title" className="font-display text-lg font-medium">Filtros</h2><div className="flex items-center gap-2"><button type="button" className="text-sm underline" onClick={() => setDraft(defaultFilters)}>Limpar</button><Button variant="ghost" size="icon" aria-label="Fechar filtros" onClick={() => filterDialog.current?.close()}><X /></Button></div></div>
      <div className="space-y-[18px] overflow-y-auto px-5 pb-6">{groups.map((group) => <fieldset key={group.key}><legend className="mb-2 font-mono text-eyebrow uppercase text-lab-text-muted">{group.label}</legend><div className="flex flex-wrap gap-1.5">{group.options.map((option) => <button key={option.value} type="button" aria-pressed={optionSelected(draft, group, option)} onClick={() => setDraft(withOption(draft, group, option))} className={cn("min-h-11 rounded-control border px-3 text-[13px] font-medium", optionSelected(draft, group, option) ? "border-lab-border-strong bg-lab-surface-2" : "border-lab-border text-lab-text-dim")}>{option.label}</button>)}</div></fieldset>)}</div>
      <div className="sticky bottom-0 border-t border-lab-border bg-lab-surface-1 px-5 pb-5 pt-3"><Button asChild className="h-12 w-full" variant="secondary"><Link href={libraryFilterHref(draft)} onClick={() => filterDialog.current?.close()}>Aplicar filtros</Link></Button></div>
    </dialog>
  </main>;
}
