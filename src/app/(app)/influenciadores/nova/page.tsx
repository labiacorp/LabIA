import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { CostChip } from "@/components/ui/cost-chip";
import { previewItems, profileFromFaceItem, sheetFromFaceItem } from "@/lib/character";
import { quote } from "@/lib/generation";
import { cardOf } from "@/lib/kit";
import { getBalanceBrl } from "@/lib/ledger";
import { chargeBrl, costCredits, costText, creditsText } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { KitWatcher } from "../../i/[id]/personagem/kit-watcher";
import { BriefForm, ChooseFace } from "./forms";

export const dynamic = "force-dynamic";

// Nova influencer, from the design: 1 de 2 (brief + previews), 2 de 2 (choose the face), then "está pronta".
export default async function NewInfluencerPage({ searchParams }: { searchParams: Promise<{ id?: string; pronta?: string }> }) {
  const userId = await requireUserId();
  const { id } = await searchParams;
  const balance = await getBalanceBrl(userId);
  const sample = { name: "", role: "Lifestyle", visualSignature: "rosto" };
  const previewBrl = quote(previewItems(sample)).totalBrl;
  if (!id) return <div className="mx-auto max-w-[640px]"><BriefForm intent={randomUUID()} previewBrl={previewBrl} balanceBrl={balance} /></div>;

  const influencer = await prisma.influencer.findFirst({ where: { id, userId }, include: { steps: { where: { kind: "CHARACTER" }, orderBy: { createdAt: "asc" }, include: { assets: true } } } });
  if (!influencer) notFound();
  const charged = influencer.steps.reduce((sum, step) => sum + chargeBrl(Number(step.actualCostBrl ?? 0)), 0);

  if (influencer.faceAssetId) {
    const assets = influencer.steps.flatMap((step) => step.assets);
    const face = assets.find((asset) => asset.id === influencer.faceAssetId);
    const profile = assets.filter((asset) => asset.role === "PROFILE").at(-1);
    const sheet = assets.filter((asset) => asset.role === "SHEET").at(-1);
    return <div className="mx-auto flex max-w-[640px] flex-col gap-4">
      <KitWatcher influencerId={influencer.id} active={influencer.steps.some((step) => step.status === "RUNNING")} />
      {/* eslint-disable @next/next/no-img-element */}
      <div className="flex gap-2">
        {face ? <img src={face.url} alt="Front" className="aspect-[4/5] w-[120px] rounded-control object-cover shadow-[inset_0_0_0_2px_var(--lab-text)]" /> : null}
        {profile ? <img src={profile.url} alt="Side" className="aspect-[4/5] w-[120px] rounded-control object-cover" /> : null}
      </div>
      {sheet ? <img src={sheet.url} alt="Character sheet" className="w-full rounded-control" /> : null}
      {/* eslint-enable @next/next/no-img-element */}
      <h1 className="font-display text-[44px] font-black uppercase leading-[.9] lg:text-[64px]">A {influencer.name.split(" ")[0]} está pronta</h1>
      <p className="text-[15px] leading-[1.5] text-lab-text-dim">{influencer.steps.some((step) => step.status === "RUNNING") ? `Até agora, criar a influencer custou ${costText(charged)}; a ficha de referência dela termina em instantes.` : `Criar a influencer custou ${costText(charged)}.`} O próximo passo é o primeiro conteúdo dela.</p>
      <div className="flex flex-wrap gap-2">
        <Link href={`/conteudos/novo?influencer=${influencer.id}`} className={buttonVariants({ className: "h-14 px-6 text-body" })}>Criar primeiro conteúdo</Link>
        <Link href={`/i/${influencer.id}`} className={buttonVariants({ variant: "secondary", className: "h-14 px-5 text-[15px]" })}>Ver perfil</Link>
      </div>
    </div>;
  }

  const previews = influencer.steps.filter((step) => step.role === null).slice(-4);
  const running = previews.some((step) => step.status === "RUNNING");
  const reserved = previews.reduce((sum, step) => sum + Number(step.estimatedCostBrl ?? 0), 0);
  const actual = previews.every((step) => step.actualCostBrl !== null) ? previews.reduce((sum, step) => sum + chargeBrl(Number(step.actualCostBrl)), 0) : null;
  const sheetBrl = quote([sheetFromFaceItem(cardOf(influencer), "https://estimate"), profileFromFaceItem(cardOf(influencer), "https://estimate")]).totalBrl;
  return <div className="mx-auto flex max-w-[640px] flex-col gap-6">
    <KitWatcher influencerId={influencer.id} active={running} />
    <div className="flex flex-col gap-2"><span className="font-mono text-caption uppercase tracking-[.1em] text-lab-text-dim">Nova influencer · 2 de 2</span><h1 className="font-display text-[44px] font-black uppercase leading-[.9] lg:text-[64px]">Escolha o rosto</h1></div>
    {previews.length ? <div className="flex flex-wrap items-center gap-2.5">
      {running ? <CostChip state="estimated" value={reserved} prefix="reservado" /> : actual !== null ? <CostChip state="actual" value={actual} /> : null}
      {!running && actual !== null && costCredits(reserved) > costCredits(actual) ? <span className="text-[13px] text-lab-text-dim">previsto ~{costText(reserved)} · {creditsText(costCredits(reserved) - costCredits(actual))} voltaram</span> : null}
    </div> : null}
    <ChooseFace influencerId={influencer.id} running={running} balanceBrl={balance} sheetBrl={sheetBrl} previewBrl={previewBrl} approveIntent={randomUUID()} againIntent={randomUUID()}
      faces={(previews.length ? previews : Array.from({ length: 4 }, (_, n) => ({ id: `empty-${n}`, status: "PENDING", assets: [] }))).map((step) => ({ id: step.assets[0]?.id ?? step.id, url: step.assets[0]?.url ?? null, status: step.status }))} />
  </div>;
}
