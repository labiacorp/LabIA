import Link from "next/link";
import { LEGAL_UPDATED_AT } from "@/lib/consent";

// Who runs LabIA: only on the legal pages, not on the landing.
export const LEGAL_ENTITY = "LABIA · CNPJ 49.192.199/0001-96 · contato@labia.studio";

export type LegalSection = { heading: string; paragraphs: string[] };

// Plain reading layout for /termos and /privacidade, outside the signed-in shell.
export function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: LegalSection[] }) {
  return <main className="mx-auto max-w-2xl px-5 py-12">
    <Link href="/" className="lab-wordmark text-[28px] leading-none">Lab<span>I</span>A</Link>
    <h1 className="mt-8 font-display text-[clamp(44px,8vw,72px)] leading-[.9]">{title}</h1>
    <p className="mt-2 text-caption text-lab-text-muted">Última atualização: {LEGAL_UPDATED_AT}</p>
    <p className="mt-6 text-body leading-7 text-lab-text-dim">{intro}</p>
    {sections.map((section) => <section key={section.heading} className="mt-8"><h2 className="font-display text-[32px] leading-none">{section.heading}</h2>{section.paragraphs.map((p) => <p key={p} className="mt-3 text-body leading-7 text-lab-text-dim">{p}</p>)}</section>)}
    <p className="mt-12 text-caption text-lab-text-muted">{LEGAL_ENTITY}</p>
    <p className="mt-2 text-caption text-lab-text-muted"><Link href="/termos" className="underline">Termos de Uso</Link> · <Link href="/privacidade" className="underline">Política de Privacidade</Link></p>
  </main>;
}
