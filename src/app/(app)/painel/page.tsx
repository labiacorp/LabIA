import Link from "next/link";
import { ArrowUpRight, Users, ImageIcon, Sparkles, BookOpen, ArrowRight, Play } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { ProductionCard } from "@/components/app/production-card";

export default async function DashboardPage() {
  const userId = await requireUserId();
  const [influencers, contents, assets, recent] = await Promise.all([
    prisma.influencer.count({ where: { userId } }),
    prisma.content.count({ where: { influencer: { userId }, archivedAt: null } }),
    prisma.asset.count({ where: { userId } }),
    prisma.content.findMany({ where: { influencer: { userId }, archivedAt: null }, orderBy: [{updatedAt:"desc"},{id:"desc"}], take: 6, include: { influencer: { select: { name: true } }, assets: {where:{userId,kind:"IMAGE"},orderBy:{createdAt:"desc"},take:1,select:{url:true}} } }),
  ]);
  return <div className="mx-auto max-w-content">
    <div className="home-heading"><div><p>SEU ESPAÇO CRIATIVO</p><h1>O que vamos criar hoje?</h1></div><Link href="/conteudos/novo" className={buttonVariants({variant:"secondary"})}>Nova produção<ArrowUpRight className="size-4" /></Link></div>
    <section className="home-studio-hero">
      <div className="home-studio-copy"><span className="home-tool-label"><Sparkles className="size-3.5" />ESTÚDIO DE PERSONAGENS</span><h2>Uma identidade.<br />Infinitas histórias.</h2><p>Crie seu personagem, prepare as referências e mantenha a mesma identidade em cada produção.</p><Link href="/?criar=1" className={buttonVariants({size:"lg"})}>Criar personagem<ArrowRight className="size-4" /></Link></div>
      <div className="home-process-art" aria-label="Da identidade à cena e ao vídeo"><div className="home-art-grid" aria-hidden /><div className="home-art-card home-art-character"><Users className="size-10" aria-hidden /><span>Identidade</span></div><div className="home-art-card home-art-scene"><ImageIcon className="size-10" aria-hidden /><span>Cena</span></div><div className="home-art-card home-art-video"><Play className="size-10" aria-hidden /><span>Movimento</span></div><p>Um personagem. Todo o seu universo.</p></div>
    </section>
    <div className="home-entry-grid">
      <Link href="/trends" className="home-entry"><span className="home-entry-icon"><Sparkles className="size-5" /></span><span><strong>Recrie um movimento</strong><small>Seu vídeo, seus personagens.</small></span><ArrowUpRight className="size-4" /></Link>
      <Link href="/modelos" className="home-entry"><span className="home-entry-icon"><BookOpen className="size-5" /></span><span><strong>Encontre uma ideia</strong><small>Roteiros prontos para adaptar.</small></span><ArrowUpRight className="size-4" /></Link>
      <Link href="/biblioteca" className="home-entry"><span className="home-entry-icon"><ImageIcon className="size-5" /></span><span><strong>Reutilize seus arquivos</strong><small>Referências e mídias em um lugar.</small></span><ArrowUpRight className="size-4" /></Link>
    </div>
    <div className="home-recent-heading"><h2>Continue criando</h2><Link href="/conteudos">Ver produções<ArrowRight className="size-4" /></Link></div>
    {recent.length ? <div className="home-recent-grid">{recent.map(content => <ProductionCard key={content.id} id={content.id} influencerId={content.influencerId} title={content.title} influencerName={content.influencer.name} status={content.status} updatedAt={content.updatedAt} preview={content.assets[0]?.url} />)}</div> : <EmptyState title="Sua primeira história começa aqui" description="Escolha um personagem e prepare o primeiro briefing. O rascunho é gratuito." action={<Link href="/conteudos/novo" className={buttonVariants({variant:"secondary"})}>Preparar produção<ArrowRight className="size-4" /></Link>} />}
    <nav aria-label="Resumo do seu espaço" className="home-summary"><Link href="/influenciadores">{`${influencers} ${influencers === 1 ? "personagem" : "personagens"}`}</Link><span aria-hidden>·</span><Link href="/conteudos">{`${contents} ${contents === 1 ? "produção" : "produções"}`}</Link><span aria-hidden>·</span><Link href="/biblioteca">{`${assets} ${assets === 1 ? "arquivo" : "arquivos"}`}</Link></nav>
  </div>;
}
