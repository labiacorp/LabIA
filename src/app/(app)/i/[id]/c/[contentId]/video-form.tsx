"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/track";
import { CostChip } from "@/components/ui/cost-chip";
import { Field, Select, Textarea } from "@/components/ui/field";
import type { ContentState } from "./actions";

const totalPrice = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const perSecond = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 3, maximumFractionDigits: 4 });

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

type VideoFormProps = {
  action: (previous: ContentState, data: FormData) => Promise<ContentState>;
  intent: string;
  prompt: string;
  balanceBrl: number;
  blockedReason?: string;
  options: VideoFormOption[];
};

export function VideoForm({ action, intent, prompt, balanceBrl, blockedReason, options }: VideoFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  const [quality, setQuality] = useState("720p");
  function preferredIndex(item: VideoFormOption, resolution: string, audio?: boolean) {
    const match = (config: VideoFormOption["configurations"][number]) => config.resolution === resolution && (audio === undefined || config.audio === audio);
    const standard = item.configurations.findIndex((config) => match(config) && config.duration === 5);
    if (standard >= 0) return standard;
    const sameAudio = item.configurations.findIndex(match);
    if (sameAudio >= 0) return sameAudio;
    const sameDuration = item.configurations.findIndex((config) => config.resolution === resolution && config.duration === 5);
    return sameDuration >= 0 ? sameDuration : item.configurations.findIndex((config) => config.resolution === resolution);
  }
  const availableOptions = options;
  const firstAvailable = availableOptions.find((item) => preferredIndex(item, quality) >= 0);
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
  const insufficientBalance = !!configuration && balanceBrl + 1e-9 < configuration.brl;
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
    <form action={formAction} className="mt-4 grid min-w-0 gap-3" aria-busy={pending}>
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="expectedBrl" value={configuration?.brl ?? ""} />
      <input type="hidden" name="strategy" value={option?.strategy ?? ""} />
      <input type="hidden" name="model" value={option?.model ?? ""} />
      <input type="hidden" name="generateAudio" value={configuration?.audio ? "true" : "false"} />
      <input type="hidden" name="resolution" value={configuration?.resolution ?? ""} />
      <Field label="Modelo de vídeo" htmlFor="video-model" description={option?.notice}>
        <Select
          id="video-model"
          className="h-11 min-w-0"
          value={option?.key ?? ""}
          onChange={(event) => chooseModel(event.target.value)}
          disabled={pending || availableOptions.length === 0}
          aria-describedby={option?.notice ? "video-model-description" : undefined}
        >
          {availableOptions.length === 0 ? <option value="">Nenhum modelo disponível</option> : null}
          {availableOptions.map((item) => <option key={item.key} value={item.key} disabled={item.configurations.length === 0}>{item.name}</option>)}
        </Select>
      </Field>
      {option?.strategy === "clip" && configuration ? <>
          {canChooseAudio ? (
            <label htmlFor="video-audio" className="flex min-h-11 cursor-pointer items-center gap-3 text-body-sm text-lab-text">
              <input id="video-audio" type="checkbox" className="size-5 accent-lab-reagent focus-visible:outline-2 focus-visible:outline-offset-2" checked={configuration?.audio ?? false} onChange={(event) => chooseAudio(event.target.checked)} disabled={pending} />
              <span>Gerar áudio{sameAudioEstimate ? <span className="ml-2 text-caption text-lab-text-dim">· mesma estimativa</span> : null}</span>
            </label>
          ) : <p className="text-caption text-lab-text-dim">{configuration?.audio ? "Áudio incluído" : "Áudio não disponível nesta opção"}</p>}
      </> : null}
      <Field label="Qualidade" htmlFor="video-quality">
        <Select id="video-quality" className="h-11" value={quality} onChange={(event) => chooseQuality(event.target.value)} disabled={pending}>
          {qualities.map((value) => <option key={value} value={value}>{qualityLabel(value)}</option>)}
        </Select>
      </Field>

      {configuration && pricing?.baseFeesBrl?.[configuration.resolution] ? <p className="text-caption text-lab-text-dim">+ {totalPrice.format(pricing.baseFeesBrl[configuration.resolution])} por geração.</p> : null}
      {pricing?.imageFeeBrl ? <p className="text-caption text-lab-text-dim">+ {perSecond.format(pricing.imageFeeBrl)} por imagem de entrada.</p> : null}
      {pricing ? <details className="text-caption text-lab-text-dim"><summary className="cursor-pointer">Detalhes do preço</summary>
        <p className="mt-2">{pricing.perClip ? "Cobrança por clipe; R$/s é um equivalente." : pricing.approximate ? "R$/s aproximado; a cobrança depende dos pixels e duração." : "Tarifa para a qualidade e áudio selecionados."} <a href={pricing.source} target="_blank" rel="noreferrer" className="underline">Fonte fal.ai</a> · Conferido em {pricing.checkedOn.split("-").reverse().join("/")}.</p>
      </details> : null}
      {option?.strategy === "clip" && configuration ? (
        <>
          <div className="grid min-w-0 gap-3">
            <Field label="Duração" htmlFor="video-duration">
              <input type="hidden" name="duration" value={configuration.duration} />
              <div className="flex items-baseline justify-between gap-3" aria-live="polite" aria-atomic="true">
                <span className="text-body-sm text-lab-text">{configuration.duration}s</span>
                <span className="text-body-sm text-lab-text"><span className="text-lab-text-dim">Total estimado </span>{totalPrice.format(configuration.brl)}</span>
              </div>
              {durations.length > 1 ? <>
                <input id="video-duration" type="range" min={0} max={durations.length - 1} step={1}
                  value={durations.indexOf(configuration.duration)}
                  aria-valuetext={`${configuration.duration} segundos, total estimado ${totalPrice.format(configuration.brl)}`}
                  className="h-11 w-full cursor-pointer accent-lab-reagent focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed"
                  onChange={(event) => chooseDuration(durations[Number(event.target.value)])} disabled={pending} />
                <div className="flex justify-between text-caption text-lab-text-dim" aria-hidden="true"><span>{durations[0]}s</span><span>{durations[durations.length - 1]}s</span></div>
              </> : <p id="video-duration" className="text-caption text-lab-text-dim">Duração disponível nesta configuração.</p>}

            </Field>
          </div>

        </>
      ) : (
        <>
          <input type="hidden" name="duration" value={configuration?.duration ?? ""} />
        </>
      )}
      <Field label="Movimento e ação" htmlFor="video-prompt" description="Descreva o que acontece no vídeo. A imagem desta etapa será usada como referência.">
        <Textarea id="video-prompt" name="prompt" defaultValue={prompt} required maxLength={2000} disabled={pending} aria-describedby="video-prompt-description" />
      </Field>
      {blockedReason || insufficientBalance ? <Alert variant="warning" title={blockedReason ?? "Saldo insuficiente para esta configuração."}>{blockedReason ? null : <>Escolha uma opção mais barata ou <Link href="/saldo" className="underline">recarregue o saldo</Link>.</>}</Alert> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="cost" onClick={() => track("generate_clicked", { kind: "video", estimate_brl: configuration?.brl ?? 0 })} size="lg" loading={pending} disabled={!!blockedReason || unavailable || insufficientBalance}>Aprovar custo e gerar vídeo</Button>
        <span aria-live="polite" aria-atomic="true">
          <CostChip state={configuration ? "estimated" : "unavailable"} value={configuration?.brl} prefix="total estimado" />
        </span>
      </div>
      {unavailable ? <p role="status" className="text-caption text-lab-warning">Nenhuma configuração de vídeo disponível.</p> : null}
      {state.error ? <Alert variant="error" title={state.error} /> : null}
    </form>
  );
}
