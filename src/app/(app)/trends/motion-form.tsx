"use client";
import { costText } from "@/lib/plan";
import Image from "next/image";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { InlineUpload } from "@/components/app/inline-upload";
import { DEFAULT_MOTION_MODEL, findMotionModel, MOTION_MODELS, motionEstimate, type MotionBrief } from "@/lib/motion";
import { createMotion, trimSource } from "./actions";
type Media = {
  id: string;
  url: string;
  name: string;
  durationSec: number | null;
};
export function MotionForm({
  trend,
  modelPrompts,
  characters,
  images: savedImages,
  videos: savedVideos,
  uploadReady = true,
  initial,
  rate,
}: {
  trend: { id: string; name: string; roles: readonly string[] };
  modelPrompts: Record<string, string>;
  characters: { id: string; name: string }[];
  images: Media[];
  videos: Media[];
  uploadReady?: boolean;
  initial?: MotionBrief;
  rate: number;
}) {
  const [state, action, pending] = useActionState(createMotion, "");
  // Files uploaded from this form join the lists at once, so nothing has to be imported elsewhere first.
  const [uploaded, setUploaded] = useState<{ images: Media[]; videos: Media[] }>({ images: [], videos: [] });
  const images = [...uploaded.images, ...savedImages];
  const videos = [...uploaded.videos, ...savedVideos];
  const [sourceId, setSource] = useState(
    initial?.sourceId ?? videos[0]?.id ?? "",
  );
  const [trimSeconds, setTrimSeconds] = useState("");
  const [trimming, setTrimming] = useState(false);
  const [trimError, setTrimError] = useState("");
  const [refs, setRefs] = useState<string[]>(initial?.referenceIds ?? []);
  const [modelId, setModelId] = useState(initial?.model ?? DEFAULT_MOTION_MODEL);
  const model = findMotionModel(modelId) ?? MOTION_MODELS[0];
  // The prompt starts as the chosen model's text and follows a model switch until the user types in it.
  const [prompt, setPrompt] = useState(initial?.prompt ?? modelPrompts[model.id]);
  const [promptEdited, setPromptEdited] = useState(Boolean(initial));
  const resolutions = Object.keys(model.rates) as MotionBrief["resolution"][];
  const [chosen, setResolution] = useState<MotionBrief["resolution"]>(
    initial?.resolution ?? "720p",
  );
  // Switching model keeps the resolution when the new one has it, else falls back to its first.
  const resolution = resolutions.includes(chosen) ? chosen : resolutions.includes("720p") ? "720p" : resolutions[0];
  const source = videos.find((v) => v.id === sourceId);
  // What this source would cost on a model at the resolution the form holds (or the model's own default).
  const priceOf = (item: (typeof MOTION_MODELS)[number], seconds: number) => {
    const keys = Object.keys(item.rates) as MotionBrief["resolution"][];
    const pick = keys.includes(resolution) ? resolution : keys.includes("720p") ? "720p" : keys[0];
    return motionEstimate(seconds, pick, item.id).usd * rate;
  };
  const field =
    "min-h-11 w-full rounded-control border border-lab-border bg-lab-surface-2 p-3 text-body-sm";
  const usd = source?.durationSec
    ? motionEstimate(source.durationSec, resolution, model.id).usd
    : null;
  const cost = usd === null ? null : usd * rate;
  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="trend" value={trend.id} />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="grid content-start gap-4 rounded-lab border border-lab-border bg-lab-surface-1 p-5">
          <h2 className="font-display text-xl">1. Movimento de referência</h2>
          <label className="grid gap-2 text-body-sm">
            Seu vídeo
            <select
              required
              name="sourceId"
              value={sourceId}
              onChange={(e) => setSource(e.target.value)}
              className={field}
            >
              <option value="">Escolha um vídeo importado</option>
              {videos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {v.durationSec?.toFixed(1)}s
                </option>
              ))}
            </select>
          </label>
          {uploadReady && (
            <InlineUpload
              accept="video"
              label="Upload a video (MP4, 4 to 30 s)"
              onUploaded={(asset) => {
                setUploaded((current) => ({ ...current, videos: [{ id: asset.id, url: asset.url, name: asset.name, durationSec: asset.durationSec }, ...current.videos] }));
                setSource(asset.id);
              }}
            />
          )}
          {source && (
            <video
              key={source.id}
              controls
              preload="metadata"
              src={source.url}
              className="max-h-80 w-full rounded-lg bg-black"
            />
          )}
          {source?.durationSec && source.durationSec > 4 && (
            <div className="grid gap-2 rounded-control border border-lab-border bg-lab-surface-2 p-3 text-body-sm">
              <span>Testar com menos segundos (custa menos)</span>
              <span className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={4}
                  max={Math.floor(source.durationSec - 0.1)}
                  value={trimSeconds}
                  onChange={(e) => setTrimSeconds(e.target.value)}
                  placeholder="8"
                  aria-label="Segundos para manter"
                  className="min-h-11 w-24 rounded-control border border-lab-border bg-lab-surface-1 p-3"
                />
                <span className="text-lab-text-dim">segundos iniciais</span>
                <button
                  type="button"
                  disabled={trimming || !trimSeconds}
                  onClick={async () => {
                    setTrimError("");
                    setTrimming(true);
                    const result = await trimSource(source.id, Number(trimSeconds));
                    setTrimming(false);
                    if ("error" in result && result.error) return setTrimError(result.error);
                    const asset = result.asset!;
                    setUploaded((current) => ({ ...current, videos: [{ id: asset.id, url: asset.url, name: asset.name, durationSec: asset.durationSec }, ...current.videos] }));
                    setSource(asset.id);
                    setTrimSeconds("");
                  }}
                  className="inline-flex h-9 items-center rounded-full border border-lab-border-strong px-4 text-caption hover:bg-lab-surface-1 disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-lab-focus"
                >
                  {trimming ? "Cortando…" : "Criar versão curta"}
                </button>
              </span>
              <span className="text-caption text-lab-text-muted">
                Guarda o começo do vídeo como um novo vídeo na lista (sem áudio). O original continua lá.
              </span>
              {trimError && <span role="alert" className="text-caption text-lab-danger">{trimError}</span>}
            </div>
          )}
          <p className="text-body-sm text-lab-text-muted">
            O vídeo define a ação, a câmera e o tempo. Os exemplos desta página
            são estruturas; importe o vídeo que deseja recriar.
          </p>
        </section>
        <section className="grid content-start gap-4 rounded-lab border border-lab-border bg-lab-surface-1 p-5">
          <h2 className="font-display text-xl">2. Quem entra na cena?</h2>
          {trend.roles.slice(0, model.maxReferences).map((role, index) => (
            <label key={role} className="grid gap-2 text-body-sm">
              {role}
              {index > 0 ? " (opcional)" : ""}
              <select
                name="referenceIds"
                required={index === 0}
                value={refs[index] ?? ""}
                onChange={(e) =>
                  setRefs((current) => {
                    const next = [...current];
                    next[index] = e.target.value;
                    return next;
                  })
                }
                className={field}
              >
                <option value="">
                  {index === 0 ? "Escolha uma imagem" : "Não usar"}
                </option>
                {images.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              {uploadReady && (
                <InlineUpload
                  accept="image"
                  label="Upload an image"
                  onUploaded={(asset) => {
                    setUploaded((current) => ({ ...current, images: [{ id: asset.id, url: asset.url, name: asset.name, durationSec: null }, ...current.images] }));
                    setRefs((current) => {
                      const next = [...current];
                      next[index] = asset.id;
                      return next;
                    });
                  }}
                />
              )}
              {refs[index] && images.find((a) => a.id === refs[index]) && (
                <Image
                  unoptimized
                  src={images.find((a) => a.id === refs[index])!.url}
                  width={96}
                  height={96}
                  alt={`Referência: ${role}`}
                  className="h-24 w-24 rounded-lg object-cover"
                />
              )}
            </label>
          ))}
          <p className="text-caption text-lab-text-muted">
            As referências são enviadas nessa ordem. Descreva a posição de cada
            personagem nas instruções; a correspondência depende do resultado do
            modelo.
          </p>
        </section>
      </div>
      <section className="grid gap-4 rounded-lab border border-lab-border bg-lab-surface-1 p-5">
        <h2 className="font-display text-xl">3. Prepare a recriação</h2>
        <label className="grid gap-2 text-body-sm">
          Título
          <input
            name="title"
            required
            maxLength={120}
            defaultValue={trend.name}
            className={field}
          />
        </label>
        <label className="grid gap-2 text-body-sm">
          Guardar na influencer
          <select name="influencerId" required className={field}>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-body-sm">
          Instruções de cena
          <textarea
            name="prompt"
            rows={5}
            maxLength={2000}
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setPromptEdited(true);
            }}
            className={field}
          />
        </label>
        <label className="grid gap-2 text-body-sm">
          Model
          <select
            name="model"
            value={model.id}
            onChange={(e) => {
              setModelId(e.target.value);
              if (!promptEdited) setPrompt(modelPrompts[e.target.value]);
            }}
            className={field}
          >
            {MOTION_MODELS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {source?.durationSec ? ` · ${costText(priceOf(item, source.durationSec))}` : ""}
              </option>
            ))}
          </select>
          <span className="text-caption text-lab-text-muted">{model.note}</span>
        </label>
        {resolutions.includes("default") ? (
          <input type="hidden" name="resolution" value="default" />
        ) : (
          <label className="grid gap-2 text-body-sm">
            Resolução
            <select
              name="resolution"
              value={resolution}
              onChange={(e) =>
                setResolution(e.target.value as MotionBrief["resolution"])
              }
              className={field}
            >
              {resolutions.includes("480p") && <option value="480p">480p · Econômico</option>}
              {resolutions.includes("720p") && <option value="720p">720p · Equilibrado</option>}
              {resolutions.includes("1080p") && <option value="1080p">1080p · Alta resolução</option>}
            </select>
          </label>
        )}
        <div className="grid gap-1 rounded-control border border-lab-border bg-lab-surface-2 p-4 text-body-sm">
          {cost === null || !source?.durationSec ? (
            <span className="text-lab-text-dim">Escolha o vídeo para ver o custo.</span>
          ) : (
            <>
              <span className="text-caption text-lab-text-muted">Custo desta geração</span>
              <span className="font-display text-xl">~{costText(cost)}</span>
              <span className="text-lab-text-dim">
                {Math.ceil(source.durationSec)} s de vídeo no {model.name}
                {resolutions.includes("default") ? "" : ` a ${resolution}`}. Para gastar menos, crie uma versão curta do vídeo acima.
              </span>
            </>
          )}
          <span className="text-lab-text-dim">
            Nada é cobrado agora. Este botão só salva o rascunho; os créditos só saem na próxima tela, depois do seu OK.
          </span>
        </div>
        <Button
          loading={pending}
          disabled={!characters.length || !videos.length || !images.length}
          className="justify-self-start"
          size="lg"
        >
          Salvar rascunho (grátis) e ver o custo
        </Button>
        {state && (
          <p role="alert" className="text-body-sm text-lab-danger">
            {state}
          </p>
        )}
      </section>
    </form>
  );
}
