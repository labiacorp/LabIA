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

export const providerConfigured = () =>
  mockEnabled() || Boolean(process.env.FAL_KEY?.trim());

export function getProvider(): PollableProvider {
  if (mockEnabled()) return new MockProvider();
  return new FalProvider({
    usdBrlRate: Number(process.env.USD_BRL_RATE) || undefined,
  });
}
