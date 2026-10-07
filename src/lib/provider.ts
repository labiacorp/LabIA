import { usdBrlRate } from "@/lib/fx";
import { HiggsfieldProvider } from "@/lib/providers/higgsfield";
import { findMotionModel, MOTION_MODEL } from "@/lib/motion";
import { FalMotionProvider } from "@/lib/providers/fal-motion";
import { FalProvider } from "@/lib/providers/fal";
import { MockProvider } from "@/lib/providers/mock";
import type {
  GenParams,
  GenerationResult,
  JobHandle,
  ModelProvider,
} from "@/lib/providers/model-provider";

export type PollableProvider = ModelProvider & {
  checkResult(
    handle: JobHandle,
    params: GenParams,
  ): Promise<
    { state: "pending" } | { state: "done"; result: GenerationResult }
  >;
};

export const mockEnabled = () =>
  process.env.NODE_ENV !== "production" && process.env.FAL_MOCK === "1";

export const providerConfigured = (model?: string) =>
  mockEnabled() ||
  (model === MOTION_MODEL
    ? Boolean(
        process.env.HF_CREDENTIALS?.trim() &&
          process.env.LABIA_PUBLIC_URL?.startsWith("https://"),
      )
    : Boolean(process.env.FAL_KEY?.trim()));

export function getProvider(model?: string): PollableProvider {
  if (model === MOTION_MODEL) return new HiggsfieldProvider(mockEnabled());
  if (model && findMotionModel(model)) return new FalMotionProvider(mockEnabled());
  if (mockEnabled()) return new MockProvider();
  return new FalProvider({
    usdBrlRate: usdBrlRate(),
  });
}
