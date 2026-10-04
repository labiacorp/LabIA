import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { InfluencerStudio } from "./influencer-studio";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ criar?: string }> }) {
  const userId = await requireUserId();
  const initialBuilderOpen = (await searchParams).criar === "1";
  const [influencers, contents] = await Promise.all([
    prisma.influencer.findMany({
      where: { userId }, orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { contents: true } },
        assets: { where: { role: { in: ["FRONT", "SHEET"] } }, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.content.findMany({
      where: { influencer: { userId } }, orderBy: { updatedAt: "desc" }, take: 30,
      include: {
        influencer: { select: { name: true } },
        assets: { where: { kind: "IMAGE" }, orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { steps: { where: { status: { in: ["DONE", "APPROVED"] } } } } },
      },
    }),
  ]);
  return <InfluencerStudio
    initialBuilderOpen={initialBuilderOpen}
    influencers={influencers.map((item) => ({
      id: item.id, name: item.name, niche: item.niche, tone: item.tone,
      persona: item.persona, visualSignature: item.visualSignature,
      faceUrl: item.assets.find((asset) => asset.id === item.faceAssetId)?.url ?? null,
      sheetUrl: item.assets.find((asset) => asset.role === "SHEET")?.url ?? null,
      hasFace: item.assets.some((asset) => asset.id === item.faceAssetId), contentCount: item._count.contents,
    }))}
    history={contents.map((item) => ({ id: item.id, influencerId: item.influencerId, title: item.title,
      influencerName: item.influencer.name, image: item.assets[0]?.url ?? null, count: item._count.steps }))}
  />;
}
