import Link from "next/link";
import { referenceStorageReady } from "@/lib/reference-storage";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { ImportForm } from "./form";

export const dynamic = "force-dynamic";

// Bring an influencer that already exists (a photo you have): no generation and no cost.
export default async function ImportInfluencerPage() {
  const userId = await requireUserId();
  const images = await prisma.asset.findMany({ where: { userId, kind: "IMAGE", storageKey: { not: null }, influencerId: null }, orderBy: { createdAt: "desc" }, take: 24, select: { id: true, url: true, fileName: true } });
  return <div className="mx-auto flex max-w-[640px] flex-col gap-5">
    <div className="flex flex-col gap-2">
      <span className="font-mono text-caption uppercase tracking-[.1em] text-lab-text-dim">Import influencer</span>
      <h1 className="font-display text-[30px] font-black uppercase leading-[.95] lg:text-[40px]">I already have her</h1>
      <p className="text-body-sm text-lab-text-dim">Upload her photo, name her. She can then be used in Trends and in Content without generating a face. Want to create one from a description instead? <Link href="/influenciadores/nova" className="underline">Create a new one</Link>.</p>
    </div>
    <ImportForm images={images.map((image) => ({ id: image.id, url: image.url, name: image.fileName ?? "Image" }))} uploadReady={referenceStorageReady()} />
  </div>;
}
