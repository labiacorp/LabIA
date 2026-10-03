import { FAL_VIDEO_MODELS } from "@/lib/providers/fal-models";
import { getBoolean, getString, nodeStatusLabel } from "@/components/nodes/node-control-values";

export const videoModelOptions = FAL_VIDEO_MODELS.map((model) => ({
  id: model.id,
  name: model.name,
  supportedDurations: model.supportedDurations,
  nativeAudio: model.nativeAudio,
  defaultInput: model.defaultInput,
}));

function getVideoDurationOptions(model: (typeof videoModelOptions)[number]) {
  if (model.supportedDurations.includes("4-15")) {
    return Array.from({ length: 12 }, (_, index) => String(index + 4));
  }

  return model.supportedDurations
    .filter((duration) => duration !== "auto")
    .map((duration) => duration.replace(/s$/i, ""));
}

function getVideoResolutionOptions(modelId: string) {
  if (modelId.includes("wan-25-preview")) {
    return ["480p", "720p", "1080p"];
  }

  if (modelId.includes("seedance-2.0")) {
    return ["720p", "1080p"];
  }

  return [];
}

function supportsNativeAudio(model: (typeof videoModelOptions)[number]) {
  return model.nativeAudio.status === "supported";
}

export function VideoControls({
  params,
  updateParams,
  mode,
}: {
  params: Record<string, unknown>;
  updateParams: (nextParams: Record<string, unknown>) => void;
  mode: "image" | "text" | "extend";
}) {
  const selectedVideoModel =
    getString(params.model) ??
    videoModelOptions[0]?.id ??
    "fal-ai/wan-25-preview/image-to-video";
  const selectedVideoModelInfo =
    videoModelOptions.find((model) => model.id === selectedVideoModel) ??
    videoModelOptions[0];
  const videoDurationOptions = selectedVideoModelInfo
    ? getVideoDurationOptions(selectedVideoModelInfo)
    : [];
  const selectedVideoDuration =
    getString(params.duration)?.replace(/s$/i, "") ??
    (typeof selectedVideoModelInfo?.defaultInput.duration === "string"
      ? selectedVideoModelInfo.defaultInput.duration.replace(/s$/i, "")
      : videoDurationOptions[0]);
  const videoResolutionOptions = getVideoResolutionOptions(selectedVideoModel);
  const selectedVideoResolution =
    getString(params.resolution) ??
    (typeof selectedVideoModelInfo?.defaultInput.resolution === "string"
      ? selectedVideoModelInfo.defaultInput.resolution
      : videoResolutionOptions[0]);
  const selectedGenerateAudio =
    getBoolean(params.generate_audio) ??
    (typeof selectedVideoModelInfo?.defaultInput.generate_audio === "boolean"
      ? selectedVideoModelInfo.defaultInput.generate_audio
      : false);
  const assetUrl = getString(params.assetUrl);
  const generationStatus = getString(params.generationStatus);
  const isExtend = mode === "extend";

  if (!selectedVideoModelInfo) {
    return null;
  }

  return (
    <div className="mt-3 space-y-3">
      <label className="block">
        <span className="mb-1 block font-mono text-eyebrow uppercase text-lab-text-muted">
          modelo
        </span>
        <select
          aria-label="Modelo de vídeo"
          value={selectedVideoModel}
          onChange={(event) => {
            const nextModel =
              videoModelOptions.find(
                (model) => model.id === event.target.value,
              ) ?? videoModelOptions[0];
            const nextDurations = getVideoDurationOptions(nextModel);
            const nextResolutions = getVideoResolutionOptions(nextModel.id);

            updateParams({
              model: nextModel.id,
              duration:
                typeof nextModel.defaultInput.duration === "string"
                  ? nextModel.defaultInput.duration.replace(/s$/i, "")
                  : nextDurations[0],
              resolution:
                typeof nextModel.defaultInput.resolution === "string"
                  ? nextModel.defaultInput.resolution
                  : nextResolutions[0],
              generate_audio:
                typeof nextModel.defaultInput.generate_audio === "boolean"
                  ? nextModel.defaultInput.generate_audio
                  : false,
            });
          }}
          className="nodrag nowheel h-9 w-full rounded-control border border-lab-border bg-lab-surface-1 px-2 text-xs text-lab-text outline-none transition-colors focus:border-lab-border-strong focus:shadow-lab-focus"
        >
          {videoModelOptions.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </label>

      <div className="rounded-control border border-lab-border bg-lab-surface-1 px-2.5 py-2">
        <div className="truncate font-mono text-eyebrow text-lab-text-dim">
          {selectedVideoModelInfo.name}
        </div>
        <div className="mt-1 font-mono text-eyebrow text-lab-text-muted">
          Custo calculado antes de executar
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block font-mono text-eyebrow uppercase text-lab-text-muted">
          {isExtend ? "continuação" : "movimento"}
        </span>
        <textarea
          aria-label={isExtend ? "Prompt de continuação" : "Prompt de movimento"}
          value={getString(params.prompt) ?? ""}
          onChange={(event) => updateParams({ prompt: event.target.value })}
          placeholder={
            isExtend
              ? "Descreva a continuação do clipe..."
              : "Descreva cena, movimento, câmera e ritmo..."
          }
          className="nodrag nowheel h-20 w-full resize-none rounded-control border border-lab-border bg-lab-surface-1 px-3 py-2 font-mono text-xs leading-5 text-lab-text outline-none transition-colors placeholder:text-lab-text-muted focus:border-lab-border-strong focus:shadow-lab-focus"
        />
      </label>

      {isExtend ? (
        <label className="block">
          <span className="mb-1 block font-mono text-eyebrow uppercase text-lab-text-muted">
            contexto de cena
          </span>
          <textarea
            aria-label="Contexto de cena"
            value={getString(params.sceneContext) ?? ""}
            onChange={(event) => updateParams({ sceneContext: event.target.value })}
            placeholder="Personagem, luz, câmera e estilo que devem continuar..."
            className="nodrag nowheel h-20 w-full resize-none rounded-control border border-lab-border bg-lab-surface-1 px-3 py-2 font-mono text-xs leading-5 text-lab-text outline-none transition-colors placeholder:text-lab-text-muted focus:border-lab-border-strong focus:shadow-lab-focus"
          />
        </label>
      ) : null}

      <label className="block">
        <span className="mb-1 block font-mono text-eyebrow uppercase text-lab-text-muted">
          duração
        </span>
        <select
          aria-label="Duração do vídeo"
          value={selectedVideoDuration}
          onChange={(event) => updateParams({ duration: event.target.value })}
          className="nodrag nowheel h-9 w-full rounded-control border border-lab-border bg-lab-surface-1 px-2 text-xs text-lab-text outline-none transition-colors focus:border-lab-border-strong focus:shadow-lab-focus"
        >
          {videoDurationOptions.map((duration) => (
            <option key={duration} value={duration}>
              {duration}s
            </option>
          ))}
        </select>
      </label>

      {videoResolutionOptions.length > 0 ? (
        <label className="block">
          <span className="mb-1 block font-mono text-eyebrow uppercase text-lab-text-muted">
            resolução
          </span>
          <select
            aria-label="Resolução do vídeo"
            value={selectedVideoResolution}
            onChange={(event) => updateParams({ resolution: event.target.value })}
            className="nodrag nowheel h-9 w-full rounded-control border border-lab-border bg-lab-surface-1 px-2 text-xs text-lab-text outline-none transition-colors focus:border-lab-border-strong focus:shadow-lab-focus"
          >
            {videoResolutionOptions.map((resolution) => (
              <option key={resolution} value={resolution}>
                {resolution}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {supportsNativeAudio(selectedVideoModelInfo) ? (
        <label className="flex items-center justify-between gap-3 rounded-control border border-lab-border bg-lab-surface-1 px-2.5 py-2">
          <span className="text-xs text-lab-text-dim">Gerar áudio</span>
          <input
            type="checkbox"
            aria-label="Gerar áudio"
            checked={selectedGenerateAudio}
            onChange={(event) =>
              updateParams({ generate_audio: event.target.checked })
            }
            className="nodrag size-4 accent-lab-reagent"
          />
        </label>
      ) : null}

      {mode === "image" ? (
        <details className="rounded-control border border-lab-border bg-lab-surface-1 px-2.5 py-2">
          <summary className="cursor-pointer text-xs text-lab-text-dim">
            Usar link de imagem (avançado)
          </summary>
          <div className="mt-2 space-y-2">
            <p className="text-eyebrow leading-5 text-lab-text-muted">
              Prefira conectar uma imagem-base importada do Projeto.
            </p>
        <label className="block">
          <span className="mb-1 block font-mono text-eyebrow uppercase text-lab-text-muted">
            imagem de entrada
          </span>
          <input
            aria-label="URL da imagem de entrada"
            value={
              getString(params.image_url) ??
              getString(params.imageUrl) ??
              getString(params.assetUrl) ??
              ""
            }
            onChange={(event) =>
              updateParams({ image_url: event.target.value || undefined })
            }
            placeholder="URL de asset, se não houver nó conectado"
            className="nodrag nowheel h-9 w-full rounded-control border border-lab-border bg-lab-bg px-2 font-mono text-xs text-lab-text outline-none transition-colors placeholder:text-lab-text-muted focus:border-lab-border-strong focus:shadow-lab-focus"
          />
        </label>
          </div>
        </details>
      ) : null}

      {getString(params.generationId) && assetUrl ? (
        <div className="overflow-hidden rounded-control border border-lab-border bg-lab-surface-1">
          <video src={assetUrl} controls className="aspect-video w-full object-cover" />
        </div>
      ) : generationStatus ? (
        <div className="flex h-24 items-center justify-center rounded-control border border-dashed border-lab-border bg-lab-surface-1 text-xs text-lab-text-muted">
          {generationStatus === "done" ? "vídeo indisponível" : nodeStatusLabel(generationStatus)}
        </div>
      ) : (
        <div className="flex h-20 items-center justify-center rounded-control border border-dashed border-lab-border bg-lab-surface-1 px-3 text-center text-xs text-lab-text-muted">
          {mode === "image"
            ? "Conecte uma imagem ou informe um asset."
            : isExtend
              ? "Conecte o vídeo anterior."
              : "Conecte um Prompt ou digite o texto."}
        </div>
      )}

      {getString(params.errorMessage) ? (
        <p className="rounded-control border border-lab-danger/40 bg-lab-surface-1 px-2 py-1.5 text-xs text-lab-danger">
          {getString(params.errorMessage)}
        </p>
      ) : null}
    </div>
  );
}
