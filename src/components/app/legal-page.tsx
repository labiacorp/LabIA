import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LEGAL_UPDATED_AT } from "@/lib/consent";

// Who runs LabIA: only on the legal pages, not on the landing.
export const LEGAL_ENTITY = "LABIA · CNPJ 49.192.199/0001-96 · contato@labia.studio";

export type LegalSection = { heading: string; paragraphs: string[] };

// Termos de uso / Privacidade, design layout (top bar with the two tabs, numbered sections). The legal text
// itself lives in each page and is unchanged by the layout.
export function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: LegalSection[] }) {
  const tab = (href: string, label: string) => <Link href={href} aria-current={title.startsWith(label) ? "page" : undefined}
    className={`flex h-9 items-center rounded-full px-3.5 text-body-sm font-medium ${title.startsWith(label) ? "bg-lab-text text-lab-bg" : "text-lab-text"}`}>{label}</Link>;
  return <div className="min-h-screen">
    <header className="sticky top-0 z-header flex h-16 items-center gap-3 border-b border-lab-border bg-lab-bg/90 px-4 backdrop-blur lg:px-10">
      <Link href="/" aria-label="Voltar" className="flex size-11 items-center justify-center rounded-full bg-lab-surface-2"><ArrowLeft className="size-[19px]" aria-hidden /></Link>
      <span className="lab-wordmark text-[26px] leading-none">Lab<span>I</span>A</span>
      <nav aria-label="Documentos" className="ml-auto flex gap-1 rounded-full border-[1.5px] border-lab-border-strong p-1">{tab("/termos", "Termos")}{tab("/privacidade", "Privacidade")}</nav>
    </header>
    <main className="mx-auto max-w-[720px] px-5 pb-16 pt-7 lg:px-10 lg:pb-20 lg:pt-12">
      <h1 className="font-display text-[30px] font-black uppercase leading-[.9] lg:text-[40px]">{title}</h1>
      <p className="mt-3 font-mono text-caption text-lab-text-dim">Última atualização: {LEGAL_UPDATED_AT}</p>
      <p className="mt-6 text-body leading-7 text-lab-text-dim">{intro}</p>
      {sections.map((section) => <section key={section.heading} className="mt-8 border-t border-lab-border pt-6"><h2 className="text-xl font-semibold">{section.heading}</h2>{section.paragraphs.map((p) => <p key={p} className="mt-3 text-body leading-7 text-lab-text-dim">{p}</p>)}</section>)}
      <p className="mt-12 font-mono text-caption text-lab-text-dim">{LEGAL_ENTITY}</p>
    </main>
  </div>;
}
