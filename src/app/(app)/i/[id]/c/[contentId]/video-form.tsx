"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { CostConfirm } from "@/components/app/cost-confirm";
import { Textarea } from "@/components/ui/field";
import { track } from "@/lib/track";
import type { ContentState } from "./actions";
import { pill } from "./scene-form";
import { DEFAULT_VIDEO, rateText } from "@/lib/plan";
const perSecond = { format: rateText };

export type VideoFormOption = {
  key: string;
  model: string;
  name: string;
  strategy: "reel" | "clip";
  configurations: {
    duration: number;
    resolution: string;
    audio: boolean;
    brl: number;
  }[];
  notice?: string;
  pricing?: {
    baseFeesBrl?: Record<string, number>; ratesBrl: Record<string, number>; audioRatesBrl?: Record<string, number>; imageFeeBrl: number;
    perClip: boolean; approximate: boolean; checkedOn: string; exchangeRate: number; source: string;
  };
};

// The cheapest clip of a model at the chosen quality, per 5 s, so every model in the picker is priced on one unit.
function priceFrom5s(item: VideoFormOption, quality: string) {
  const perFive = (config: VideoFormOption["configurations"][number]) => (config.brl / config.duration) * 5;
  const atQuality = item.configurations.filter((config) => config.resolution === quality).map(perFive);
  const prices = atQuality.length ? atQuality : item.configurations.map(perFive);
  return prices.length ? Math.min(...prices) : undefined;
}

type VideoFormProps = {
  action: (previous: ContentState, data: FormData) => Promise<ContentState>;
  intent: string;
  prompt: string;
  balanceBrl: number;
  blockedReason?: string;
  options: VideoFormOption[];
  label?: string;
};

export function VideoForm({ action, intent, prompt, balanceBrl, blockedReason, options, label = "Gerar vídeo" }: VideoFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  const [quality, setQuality] = useState<string>(DEFAULT_VIDEO.resolution);
  function preferredIndex(item: VideoFormOption, resolution: string, audio?: boolean) {
    const match = (config: VideoFormOption["configurations"][number]) => config.resolution === resolution && (audio === undefined || config.audio === audio);
    // The default model opens on the plan's 15s clip; other models on their 5s standard.
    const usual = item.model === DEFAULT_VIDEO.model ? DEFAULT_VIDEO.duration : 5;
    const standard = item.configurations.findIndex((config) => match(config) && config.duration === usual);
    if (standard >= 0) return standard;
    const sameAudio = item.configurations.findIndex(match);
    if (sameAudio >= 0) return sameAudio;
    const sameDuration = item.configurations.findIndex((config) => config.resolution === resolution && config.duration === usual);
    return sameDuration >= 0 ? sameDuration : item.configurations.findIndex((config) => config.resolution === resolution);
  }
  const availableOptions = options;
  // MiniMax is what most people use, so it is the default pick; the Kling reel and the rest stay one tap away.
  const firstAvailable = availableOptions.find((item) => item.model === DEFAULT_VIDEO.model && preferredIndex(item, quality) >= 0) ?? availableOptions.find((item) => preferredIndex(item, quality) >= 0);
  const [selection, setSelection] = useState({ key: firstAvailable?.key ?? "", index: firstAvailable ? preferredIndex(firstAvailable, quality) : 0 });
  const option = availableOptions.find((item) => item.key === selection.key) ?? firstAvailable;
  const configurations = option?.configurations ?? [];
  const qualities = [...new Set(configurations.map((config) => config.resolution))].sort((a, b) => (a === "default" ? Infinity : parseFloat(a) * (a.endsWith("k") ? 1000 : 1)) - (b === "default" ? Infinity : parseFloat(b) * (b.endsWith("k") ? 1000 : 1)));
  const selected = option?.key === selection.key ? configurations[selection.index] : undefined;
  const configuration = selected?.resolution === quality ? selected : configurations[option ? preferredIndex(option, quality) : 0];
  const durations = [...new Set(configurations.filter((item) => item.resolution === quality && item.audio === configuration?.audio).map((item) => item.duration))].sort((a, b) => a - b);
  const audioConfigurations = configurations.filter((item) => item.duration === configuration?.duration && item.resolution === configuration?.resolution);
  const canChooseAudio = configurations.some((item) => item.audio) && configurations.some((item) => !item.audio);
  const sameAudioEstimate = canChooseAudio && audioConfigurations.some((item) => item.audio) && audioConfigurations.some((item) => !item.audio) && new Set(audioConfigurations.map((item) => item.brl)).size === 1;
  const unavailable = !option || !configuration;
  const pricing = option?.pricing;
  function qualityLabel(resolution: string) {
    const label = resolution === "default" ? "Definida pelo modelo" : resolution.endsWith("k") ? resolution.toUpperCase() : resolution;
    const candidate = configurations.find((item) => item.resolution === resolution && item.duration === configuration?.duration && item.audio === configuration?.audio)
      ?? configurations[option ? preferredIndex(option, resolution, configuration?.audio) : 0];
    const rates = candidate?.audio && pricing?.audioRatesBrl ? pricing.audioRatesBrl : pricing?.ratesBrl;
    const value = pricing?.perClip && candidate ? candidate.brl / candidate.duration : rates?.[resolution];
    return value === undefined ? label : `${label} · ${pricing?.approximate || pricing?.perClip ? "≈ " : ""}${perSecond.format(value)}/s`;
  }

  function chooseDuration(duration: number) {
    if (!option || !configuration) return;
    const candidates = configurations.filter((item) => item.duration === duration);
    const next = candidates.find((item) => item.resolution === configuration.resolution && item.audio === configuration.audio)
      ?? candidates.find((item) => item.resolution === configuration.resolution)
      ?? candidates[0];
    if (next) setSelection({ key: option.key, index: configurations.indexOf(next) });
  }

  function chooseQuality(resolution: string) {
    setQuality(resolution);
    if (option) {
      const sameDuration = configurations.findIndex((item) => item.resolution === resolution && item.duration === configuration?.duration && item.audio === configuration?.audio);
      setSelection({ key: option.key, index: sameDuration >= 0 ? sameDuration : preferredIndex(option, resolution, configuration?.audio) });
    }
  }

  function chooseModel(key: string) {
    const next = options.find((item) => item.key === key);
    if (!next) return;
    const resolution = next.configurations.some((config) => config.resolution === quality) ? quality
      : next.configurations.find((config) => config.resolution === "720p")?.resolution ?? next.configurations[0]?.resolution ?? "default";
    setQuality(resolution);
    setSelection({ key, index: preferredIndex(next, resolution, configuration?.audio) });
  }

  function chooseAudio(audio: boolean) {
    if (!option) return;
    const next = audioConfigurations.find((item) => item.audio === audio)
      ?? configurations.find((item) => item.resolution === quality && item.audio === audio);
    if (next) setSelection({ key: option.key, index: configurations.indexOf(next) });
  }

  return (
    <form action={formAction} onSubmit={() => track("generate_clicked", { kind: "video", estimate_brl: configuration?.brl ?? 0 })} className="flex min-w-0 flex-col gap-3.5" aria-busy={pending}>
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="expectedBrl" value={configuration?.brl ?? ""} />
      <input type="hidden" name="strategy" value={option?.strategy ?? ""} />
      <input type="hidden" name="model" value={option?.model ?? ""} />
      <input type="hidden" name="generateAudio" value={configuration?.audio ? "true" : "false"} />
      <input type="hidden" name="resolution" value={configuration?.resolution ?? ""} />
      <input type="hidden" name="duration" value={configuration?.duration ?? ""} />
      <div className="flex flex-wrap gap-1.5">
        <select aria-label="Modelo de vídeo" className={pill} value={option?.key ?? ""} onChange={(event) => chooseModel(event.target.value)} disabled={pending || availableOptions.length === 0}>
          {availableOptions.length === 0 ? <option value="">Nenhum modelo disponível</option> : null}
          {availableOptions.map((item) => { const price = priceFrom5s(item, quality); return <option key={item.key} value={item.key} disabled={item.configurations.length === 0}>{price === undefined ? item.name : `${item.name} · from ${rateText(price)} per 5 s`}</option>; })}
        </select>
        <select aria-label="Qualidade do vídeo" className={pill} value={quality} onChange={(event) => chooseQuality(event.target.value)} disabled={pending}>
          {qualities.map((value) => <option key={value} value={value}>{qualityLabel(value)}</option>)}
        </select>
        {option?.strategy === "clip" && configuration && durations.length > 1 ? <select aria-label="Duração do vídeo" className={pill} value={configuration.duration} onChange={(event) => chooseDuration(Number(event.target.value))} disabled={pending}>
          {durations.map((value) => <option key={value} value={value}>{value} segundos</option>)}
        </select> : configuration ? <span className="flex h-8 items-center rounded-full bg-lab-surface-2 px-3 text-[13px]">{option?.strategy === "reel" ? "3 clipes de 5s" : `${configuration.duration} segundos`}</span> : null}
        {option?.strategy === "clip" && configuration && canChooseAudio ? <label className={`${pill} flex cursor-pointer items-center gap-2`}>
          <input type="checkbox" className="size-4 accent-lab-text" checked={configuration.audio} onChange={(event) => chooseAudio(event.target.checked)} disabled={pending} />Com áudio{sameAudioEstimate ? " · mesmo custo" : ""}
        </label> : null}
        <span className="flex h-8 items-center rounded-full bg-lab-surface-2 px-3 text-[13px]">a partir da imagem aprovada</span>
      </div>
      {option?.notice ? <p className="text-caption text-lab-text-dim">{option.notice}</p> : null}
      <details className="text-body-sm">
        <summary className="min-h-11 cursor-pointer content-center text-lab-text-dim">Direção do movimento</summary>
        <Textarea aria-label="Direção do movimento" name="prompt" defaultValue={prompt} required maxLength={2000} disabled={pending} className="mt-1" />
      </details>
      {blockedReason ? <Alert variant="warning" title={blockedReason} /> : null}
      {unavailable ? <p role="status" className="text-caption text-lab-warning">Nenhuma configuração de vídeo disponível.</p> : null}
      <CostConfirm costBrl={configuration?.brl} balanceBrl={balanceBrl} label={label} eyebrow={`Confirmar vídeo · ${option?.name ?? ""}`} detail={`previstos para ${configuration?.duration ?? 15} segundos de vídeo`} disabled={!!blockedReason || unavailable} pending={pending} />
      {state.error ? <Alert variant="error" title={state.error} /> : null}
    </form>
  );
}
