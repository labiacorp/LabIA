import { usdBrlRate } from "@/lib/fx";
import { z } from "zod";
export const MOTION_MODEL = "higgsfield/genjutsu/motion-transfer/v1.0";
// Motion-transfer endpoints the user can pick on /trends. `rates` are USD per second of output by resolution
// ("default" = the endpoint has no resolution choice). Kling prices checked on fal.ai on 2026-10-07; they take a single reference image.
export type MotionModel = { id: string; name: string; provider: "higgsfield" | "fal"; maxReferences: number; rates: Record<string, number>; note: string };
export const MOTION_MODELS: MotionModel[] = [
  { id: MOTION_MODEL, name: "Genjutsu Motion Transfer", provider: "higgsfield", maxReferences: 3, rates: { "480p": 0.318, "720p": 0.681, "1080p": 1.632 }, note: "Up to 3 characters. Final cost is confirmed after the run." },
  { id: "fal-ai/kling-video/v2.6/pro/motion-control", name: "Kling 2.6 Pro Motion Control", provider: "fal", maxReferences: 1, rates: { default: 0.112 }, note: "One character. Follows the video's framing, up to 30 s." },
  { id: "fal-ai/kling-video/v3/pro/motion-control", name: "Kling 3 Pro Motion Control", provider: "fal", maxReferences: 1, rates: { default: 0.168 }, note: "One character. Follows the video's framing, up to 30 s." },
];
// What the Trends form preselects: Kling runs on the fal.ai key we already have, Genjutsu needs separate Higgsfield credentials.
export const DEFAULT_MOTION_MODEL = "fal-ai/kling-video/v2.6/pro/motion-control";
// Kling options that never change per request. They travel in each generation's params so the admin details show what was sent:
// "video" = the character follows the video's position and camera (up to 30 s; "image" caps at 10 s); keep_original_sound is only the default here, each brief chooses it (`keepSound`).
export const KLING_FIXED_PARAMS = { character_orientation: "video", keep_original_sound: false } as const;
// Kling's guide: the character image needs its shorter side to be at least 340 px. Only checked when the size is known (older imports may not have it).
export const MIN_REFERENCE_PX = 340;
export const referenceTooSmall = (model: MotionModel | undefined, image?: { width: number | null; height: number | null }) =>
  model?.provider === "fal" && Boolean(image?.width && image?.height) && Math.min(image!.width!, image!.height!) < MIN_REFERENCE_PX;
export const findMotionModel = (id: string) => MOTION_MODELS.find((model) => model.id === id);
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
  // Kling only: keep the reference video's own sound in the result (off unless asked; Genjutsu's behaviour is unknown).
  keepSound: z.boolean().default(false),
  resolution: z.enum(["480p", "720p", "1080p", "default"]),
  // Briefs saved before the picker existed have no model: they were all Genjutsu.
  model: z.string().default(MOTION_MODEL),
}).superRefine((brief, context) => {
  const model = findMotionModel(brief.model);
  if (!model) return context.addIssue({ code: "custom", message: "Unknown motion model", path: ["model"] });
  if (!Object.hasOwn(model.rates, brief.resolution)) context.addIssue({ code: "custom", message: "Resolution not supported by this model", path: ["resolution"] });
  if (brief.referenceIds.length > model.maxReferences) context.addIssue({ code: "custom", message: "Too many references for this model", path: ["referenceIds"] });
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
  modelId: string = MOTION_MODEL,
) {
  if (!Number.isFinite(duration) || duration < 4 || duration > 30)
    throw Error("Invalid duration");
  const rate = findMotionModel(modelId)?.rates[resolution];
  if (rate === undefined) throw Error("Unsupported motion model or resolution");
  const seconds = Math.ceil(duration);
  const usd = seconds * rate;
  const fx = usdBrlRate();
  return { usd, brl: Math.round(usd * fx * 10000) / 10000, seconds, rate: fx };
}
