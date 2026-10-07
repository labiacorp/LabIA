import Image from "next/image";
import Link from "next/link";
import { Plus, UserRound } from "lucide-react";
import { Prisma } from "@/generated/prisma/client";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { previewItems } from "@/lib/character";
import { quote } from "@/lib/generation";
import { costText } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

// Influencers · Lista, from the design: one card per influencer (face, niche, contents, credits spent) and "Nova".
export default async function InfluencersPage() {
  const userId = await requireUserId();
  const items = await prisma.influencer.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, include: { _count: { select: { contents: { where: { archivedAt: null } } } } } });
  const [faces, spent] = await Promise.all([
    prisma.asset.findMany({ where: { userId, id: { in: items.flatMap((item) => (item.faceAssetId ? [item.faceAssetId] : [])) } }, select: { id: true, url: true } }),
    prisma.$queryRaw<{ id: string; spent: Prisma.Decimal }[]>`
      SELECT COALESCE(s.influencer_id, c.influencer_id) AS id, -SUM(l.delta_brl) AS spent
      FROM ledger_entries l JOIN steps s ON s.id = l.step_id LEFT JOIN contents c ON c.id = s.content_id
      WHERE l.user_id = ${userId} GROUP BY 1`,
  ]);
  const previewBrl = quote(previewItems({ name: "", role: "Lifestyle", visualSignature: "rosto" })).totalBrl;
  const create = (cls: string) => <Link href="/influenciadores/nova" className={cls}><Plus className="size-[18px]" />Nova</Link>;
  return <div className="mx-auto flex max-w-content flex-col gap-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <h1 className="font-display text-[44px] font-black uppercase leading-[.9] lg:text-[64px]">Influencers</h1>
      {items.length ? create(buttonVariants({ className: "h-12 px-[18px] text-[15px]" })) : null}
    </div>
    {items.length === 0 ? <EmptyState icon={UserRound} title="Nenhuma influencer" description="Crie a primeira. Você aprova o rosto antes de gerar qualquer vídeo." action={<Link href="/influenciadores/nova" className={buttonVariants({ size: "lg" })}><Plus className="size-[18px]" />Criar influencer</Link>} /> : <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
      {items.map((item) => { const face = faces.find((f) => f.id === item.faceAssetId); return <Link key={item.id} href={`/i/${item.id}`} className="flex flex-col overflow-hidden rounded-card bg-lab-surface-1 shadow-[inset_0_0_0_1px_var(--lab-border)] hover:shadow-[inset_0_0_0_1.5px_var(--lab-text-dim)] focus-visible:outline-none focus-visible:shadow-lab-focus">
        <span className="relative block aspect-[4/5] w-full bg-[repeating-linear-gradient(135deg,var(--lab-surface-2)_0_10px,var(--lab-surface-3)_10px_20px)]">{face ? <Image src={face.url} alt="" fill unoptimized className="object-cover" /> : null}</span>
        <span className="flex flex-col gap-1.5 px-3.5 pb-3.5 pt-3"><span className="break-words font-display text-2xl font-black uppercase leading-none">{item.name}</span><span className="text-[13px] text-lab-text-dim">{face ? item.niche : "Falta escolher o rosto"}</span>
          <span className="flex justify-between font-mono text-caption"><span className="text-lab-text-dim">{item._count.contents} conteúdos</span><span>{costText(Number(spent.find((row) => row.id === item.id)?.spent ?? 0))}</span></span></span>
      </Link>; })}
      <Link href="/influenciadores/nova" className="flex min-h-60 flex-col items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-lab-border-strong text-body-sm text-lab-text-dim"><Plus className="size-6" aria-hidden />Nova influencer<span className="font-mono text-caption text-lab-reagent-bright">prévia ~{costText(previewBrl)}</span></Link>
    </div>}
  </div>;
}
