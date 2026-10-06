import type { Metadata } from "next";

import { Landing } from "./landing";
import { refreshRate } from "@/lib/fx";
import { estimateReel } from "@/lib/content-plan";
import { costCredits, PLAN_CREDITS, planPriceText } from "@/lib/plan";

export const metadata: Metadata = {
  title: "LabIA · Conteúdo para influencers de IA",
  description: "Crie sua influencer de IA e produza reels com ela. Uma assinatura, créditos todo mês, e o custo de cada etapa antes de gerar.",
  // A page-level openGraph replaces the inherited one, file-based image included: name the image again.
  openGraph: { title: "LabIA · Reels com sua influencer de IA", description: "Uma assinatura, créditos todo mês. O custo antes, o real depois.", url: "/", images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "LabIA" }] },
};

// The landing quotes the same numbers as the app: the plan, and the default reel priced on a fresh dollar quote.
export const revalidate = 3600;
export default async function LandingPage() {
  await refreshRate();
  const { perStep } = estimateReel();
  const image = costCredits(perStep.IMAGE ?? 0);
  const video = costCredits(perStep.VIDEO ?? 0);
  return <Landing numbers={{ price: planPriceText(), plan: PLAN_CREDITS, image, video, reels: Math.floor(PLAN_CREDITS / (image + video)) }} />;
}
