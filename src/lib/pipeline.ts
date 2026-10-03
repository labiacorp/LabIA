import type { StepKind } from "@/generated/prisma/enums";

// The pipeline every piece of content goes through. VOICE is added when the first influencer talks.
// `accent` reuses the design system's per-kind colors (image, video, copy, publish).
export const PIPELINE: { kind: StepKind; title: string; description: string; accent: string }[] = [
  { kind: "SCRIPT", title: "Roteiro", description: "A fala e as cenas, escritas no tom do influencer.", accent: "bg-lab-node-copy" },
  { kind: "IMAGE", title: "Imagem do influencer", description: "O quadro-base da cena, mantendo o rosto do influencer.", accent: "bg-lab-node-image" },
  { kind: "VIDEO", title: "Vídeo", description: "A imagem ganha movimento.", accent: "bg-lab-node-video" },
  { kind: "ASSEMBLY", title: "Montagem final", description: "Junta os clipes aprovados em um único vídeo.", accent: "bg-lab-node-publish" },
];
