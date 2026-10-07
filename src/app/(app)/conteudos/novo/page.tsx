import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, UserRound } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_STARTERS, scriptText } from "@/lib/content-templates";
import { estimateReel, REEL } from "@/lib/content-plan";
import { DEFAULT_VIDEO } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { IMAGE_DEFINITIONS } from "@/lib/providers/image-models";
import { VIDEO_DEFINITIONS } from "@/lib/providers/video-models";
import { requireUserId } from "@/lib/session";
import { CreationForm } from "./creation-form";

// Novo conteúdo, from the design. ?template, ?copy and ?starter still prefill the idea (and script) from a saved brief.
export default async function NewContentPage({ searchParams }: { searchParams: Promise<{ influencer?: string; template?: string; starter?: string; copy?: string }> }) {
  const userId = await requireUserId();
  const params = await searchParams;
  const influencers = await prisma.influencer.findMany({ where: { userId }, select: { id: true, name: true, faceAssetId: true }, orderBy: { updatedAt: "desc" } });
  const faces = await prisma.asset.findMany({ where: { id: { in: influencers.map((i) => i.faceAssetId).filter((id): id is string => !!id) }, userId }, select: { id: true, url: true } });
  let initial: { title: string; idea: string; script: string; aspectRatio: string } | undefined;
  if (params.template) {
    const item = await prisma.contentTemplate.findFirst({ where: { id: params.template, userId } });
    if (!item) notFound();
    initial = item;
  } else if (params.copy) {
    const item = await prisma.content.findFirst({ where: { id: params.copy, influencer: { userId } }, include: { steps: { where: { kind: "SCRIPT" }, select: { input: true }, take: 1 } } });
    if (!item) notFound();
    initial = { title: `${item.title.slice(0, 110)} (cópia)`, idea: item.idea || item.title, script: scriptText(item.steps[0]?.input), aspectRatio: item.aspectRatio };
  } else if (params.starter) {
    initial = CONTENT_STARTERS.find((item) => item.id === params.starter);
    if (!initial) notFound();
  }
  const reel = estimateReel();
  const name = (list: { id: string; name: string }[], id: string) => list.find((item) => item.id === id)?.name ?? "";
  const rows = [
    { step: "Roteiro", model: "escrito por você", brl: 0 },
    { step: "Imagem", model: name(IMAGE_DEFINITIONS, REEL.image.model), brl: reel.perStep.IMAGE ?? 0 },
    { step: "Vídeo", model: name(VIDEO_DEFINITIONS, DEFAULT_VIDEO.model), brl: reel.perStep.VIDEO ?? 0 },
    { step: "Montagem", model: "LabIA", brl: 0 },
  ];
  return <div className="mx-auto flex max-w-[640px] flex-col gap-6">
    {influencers.length ? <CreationForm
      key={params.template || params.copy || params.starter || "blank"}
      influencers={influencers.map((item) => ({ id: item.id, name: item.name, face: faces.find((f) => f.id === item.faceAssetId)?.url }))}
      selected={influencers.find((i) => i.id === params.influencer)?.id ?? influencers[0].id}
      initial={initial}
      rows={rows}
      totalBrl={reel.totalBrl}
    /> : <>
      <h1 className="font-display text-[44px] font-black uppercase leading-[.9] lg:text-[64px]">Novo conteúdo</h1>
      <EmptyState icon={UserRound} title="Nenhuma influencer" description="Crie a primeira. Você aprova o rosto antes de gerar qualquer vídeo." action={<Link href="/?criar=1" className={buttonVariants({ size: "lg" })}><Plus className="size-[18px]" />Criar influencer</Link>} />
    </>}
  </div>;
}
