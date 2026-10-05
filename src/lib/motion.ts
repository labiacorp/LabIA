import { z } from "zod";
export const MOTION_MODEL = "higgsfield/genjutsu/motion-transfer/v1.0";
export const motionSchema = z.object({
  version: z.literal(1),
  trend: z.enum(["parking", "dance", "custom"]),
  sourceId: z.string().min(1),
  referenceIds: z
    .array(z.string().min(1))
    .min(1)
    .max(3)
    .refine((ids) => new Set(ids).size === ids.length),
  prompt: z.string().trim().max(2000),
  resolution: z.enum(["480p", "720p", "1080p"]),
});
export type MotionBrief = z.infer<typeof motionSchema>;
export const TRENDS = [
  {
    id: "parking",
    name: "Encontro no estacionamento",
    description:
      "Recrie uma cena de grupo com até três personagens. Use seu vídeo de referência para definir os movimentos e a câmera.",
    roles: [
      "Personagem principal",
      "Segundo personagem",
      "Terceiro personagem",
    ],
    prompt:
      "Preserve o movimento, o tempo e a câmera do vídeo original. Use a referência 1 para o personagem principal, a 2 para o segundo personagem e a 3 para o terceiro. Mantenha a identidade de cada um.",
  },
  {
    id: "dance",
    name: "Dança com seu personagem",
    description:
      "Leve a coreografia do seu vídeo para a aparência do personagem que você escolher.",
    roles: ["Personagem"],
    prompt:
      "Transfira os movimentos da dança para o personagem da referência 1. Preserve o enquadramento e o tempo, mantendo rosto e roupa consistentes.",
  },
  {
    id: "custom",
    name: "Sua própria trend",
    description:
      "Combine seu vídeo e referências para preparar uma recriação do seu jeito.",
    roles: [
      "Referência principal",
      "Segunda referência",
      "Terceira referência",
    ],
    prompt:
      "Preserve o movimento e a câmera do vídeo original. Use as referências fornecidas para a aparência dos personagens.",
  },
] as const;
export function motionEstimate(
  duration: number,
  resolution: MotionBrief["resolution"],
) {
  if (!Number.isFinite(duration) || duration < 4 || duration > 30)
    throw Error("Invalid duration");
  const seconds = Math.ceil(duration);
  const usd =
    seconds * { "480p": 0.318, "720p": 0.681, "1080p": 1.632 }[resolution];
  const configuredRate = Number(process.env.USD_BRL_RATE);
  const rate =
    Number.isFinite(configuredRate) && configuredRate > 0
      ? configuredRate
      : 5.4;
  return { usd, brl: Math.round(usd * rate * 10000) / 10000, seconds, rate };
}
