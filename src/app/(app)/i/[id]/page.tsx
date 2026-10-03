import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, contentStatus } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { createContent } from "../../actions";

export const dynamic = "force-dynamic";

const tabs = [
  { key: "conteudos", label: "Conteúdos" },
  { key: "biblioteca", label: "Biblioteca" },
  { key: "perfil", label: "Perfil" },
] as const;

export default async function InfluencerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aba?: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const aba = (await searchParams).aba ?? "conteudos";
  const influencer = await prisma.influencer.findFirst({ where: { id, userId } });
  if (!influencer) notFound();

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/" className="text-body-sm text-lab-text-dim hover:text-lab-text">← Influencers</Link>
        <h1 className="mt-2 font-display text-h1">{influencer.name}</h1>
        <p className="mt-1 text-body-sm text-lab-text-dim">{influencer.niche} · {influencer.tone}</p>
      </div>
      <nav aria-label="Seções do influencer" className="flex gap-1">
        {tabs.map((tab) => (
          <Link key={tab.key} href={`/i/${id}?aba=${tab.key}`} aria-current={aba === tab.key ? "page" : undefined} className={`flex h-8 items-center rounded-control px-3 text-body-sm font-medium transition-colors ${aba === tab.key ? "bg-lab-surface-2 text-lab-text" : "text-lab-text-dim hover:bg-lab-surface-2 hover:text-lab-text"}`}>{tab.label}</Link>
        ))}
      </nav>
      {aba === "biblioteca" ? <Library influencerId={id} /> : aba === "perfil" ? <Profile persona={influencer.persona} /> : <Contents influencerId={id} />}
    </div>
  );
}

async function Contents({ influencerId }: { influencerId: string }) {
  const contents = await prisma.content.findMany({ where: { influencerId }, orderBy: { updatedAt: "desc" } });
  return (
    <div className="grid gap-6">
      <form action={createContent.bind(null, influencerId)} className="grid gap-4 rounded-lab border border-lab-border bg-lab-surface-1 p-5">
        <p className="font-display text-h3">Novo conteúdo</p>
        <Field label="Título" htmlFor="title"><Input id="title" name="title" required maxLength={120} placeholder="Ex.: 3 erros ao começar a investir" /></Field>
        <Field label="Ideia (opcional)" htmlFor="idea"><Textarea id="idea" name="idea" maxLength={2000} rows={2} className="font-sans text-body-sm" /></Field>
        <Button className="justify-self-start">Criar conteúdo</Button>
      </form>
      {contents.length === 0 ? <p className="text-body-sm text-lab-text-dim">Nenhum conteúdo ainda.</p> : (
        <ul className="grid gap-2">
          {contents.map((content) => {
            const [variant, label] = contentStatus[content.status];
            return (
              <li key={content.id}>
                <Link href={`/i/${influencerId}/c/${content.id}`} className="flex items-center justify-between gap-4 rounded-lab border border-lab-border bg-lab-surface-1 px-5 py-4 transition-colors duration-micro ease-lab hover:border-lab-border-strong focus-visible:outline-none focus-visible:shadow-lab-focus">
                  <span className="font-medium">{content.title}</span>
                  <Badge variant={variant} dot>{label}</Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

async function Library({ influencerId }: { influencerId: string }) {
  const assets = await prisma.asset.findMany({ where: { influencerId }, orderBy: { createdAt: "desc" }, take: 60 });
  if (assets.length === 0) return <p className="text-body-sm text-lab-text-dim">Tudo que for gerado para este influencer aparece aqui.</p>;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {assets.map((asset) => (
        <li key={asset.id} className="overflow-hidden rounded-lab border border-lab-border bg-lab-surface-1">
          {asset.kind === "IMAGE" ? <img src={asset.url} alt="" className="aspect-[9/16] w-full object-cover" /> : <video src={asset.url} className="aspect-[9/16] w-full object-cover" controls preload="metadata" />}
        </li>
      ))}
    </ul>
  );
}

function Profile({ persona }: { persona: string }) {
  return <p className="max-w-form whitespace-pre-wrap text-body-sm text-lab-text-dim">{persona || "Sem descrição ainda."}</p>;
}
