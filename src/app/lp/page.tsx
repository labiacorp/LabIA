import type { Metadata } from "next";

import { Landing } from "./landing";

export const metadata: Metadata = {
  title: "LabIA · Conteúdo para influencers de IA",
  description: "Conteúdo para influencers de IA, etapa por etapa. Preço em reais antes de cada take, valor real depois.",
  openGraph: { title: "LabIA · Conteúdo para influencers de IA", description: "O preço antes. E o real depois.", url: "/" },
};

export default function LandingPage() {
  return <Landing />;
}
