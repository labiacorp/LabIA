import Link from "next/link";
import Image from "next/image";
import { Users } from "lucide-react";
import { PageHeading } from "@/components/app/page-heading";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export default async function InfluencersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const userId = await requireUserId();
  const q = String((await searchParams).q ?? "").trim().slice(0, 120);
  const items = await prisma.influencer.findMany({ where: { userId, ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}) }, orderBy: { updatedAt: "desc" }, take: 100, include: { _count: { select: { contents: { where: { archivedAt: null } } } } } });
  const portraits = await prisma.asset.findMany({where:{userId, id:{in:items.flatMap(item => item.faceAssetId ? [item.faceAssetId] : [])},kind:"IMAGE"},select:{id:true,url:true}});
  return <div className="mx-auto max-w-content"><PageHeading title="Seus influenciadores" description="Cada personagem reúne suas referências, conteúdos e arquivos." action={<Link href="/?criar=1" className={buttonVariants({ size: "lg" })}>Criar influenciador</Link>} /><form className="mb-6 flex max-w-lg gap-2"><Input name="q" aria-label="Buscar influenciador pelo nome" placeholder="Buscar pelo nome" defaultValue={q} /><button className={buttonVariants({ variant: "secondary" })}>Buscar</button></form>{items.length ? <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <article key={item.id} className="rounded-lab border border-lab-border bg-lab-surface-1 p-5"><div className="character-card-portrait">{portraits.find(asset => asset.id === item.faceAssetId) ? <Image src={portraits.find(asset => asset.id === item.faceAssetId)!.url} alt={`Retrato de ${item.name}`} width={400} height={300} unoptimized className="h-full w-full object-cover" /> : <Users className="size-10 text-lab-text-muted" />}</div><h2 className="break-words font-display text-xl">{item.name}</h2><p className="mt-2 break-words text-body-sm text-lab-text-dim">{item.niche} · {item.tone}</p><p className="my-4 text-caption text-lab-text-muted">{item._count.contents} {item._count.contents === 1 ? "conteúdo ativo" : "conteúdos ativos"} · {item.faceAssetId ? "Referência de rosto pronta" : "Kit de personagem pendente"}</p><div className="flex flex-wrap gap-2"><Link href={`/i/${item.id}`} className={buttonVariants({ variant: "secondary" })}>Abrir personagem</Link><Link href={`/i/${item.id}?aba=biblioteca`} className={buttonVariants({ variant: "ghost" })}>Biblioteca</Link></div></article>)}</div>{items.length === 100 ? <p className="mt-4 text-caption text-lab-text-muted">Exibindo os 100 mais recentes. Use a busca para encontrar outros personagens.</p> : null}</> : <EmptyState title={q ? "Nenhum personagem encontrado" : "Seu elenco começa aqui"} description={q ? "Tente outro nome ou limpe a busca." : "Crie seu primeiro influenciador e defina sua identidade no estúdio."} action={<Link href={q ? "/influenciadores" : "/?criar=1"} className={buttonVariants({ variant: "secondary", size: "lg" })}>{q ? "Limpar busca" : "Criar influenciador"}</Link>} />}</div>;
}
