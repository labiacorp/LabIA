"use client";

import { useEffect, useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import {
  AlertTriangle,
  Clapperboard,
  Film,
  FileText,
  Images,
  MessageSquareText,
  StickyNote,
  UploadCloud,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";

import { CostChip, type CostChipProps } from "@/components/ui/cost-chip";
import { LabNodeShell, type NodeState } from "@/components/nodes/lab-node-shell";
import { FAL_IMAGE_MODELS } from "@/lib/providers/fal-models";
import { getNumber, getString, nodeStatusLabel } from "@/components/nodes/node-control-values";
import { VideoControls, videoModelOptions } from "@/components/nodes/video-controls";
import type { LabFlowNode, LabNodeKind } from "@/lib/flows/graph";

export const nodeMeta: Record<
  LabNodeKind,
  {
    label: string;
    accent: string;
    Icon: LucideIcon;
  }
> = {
  "text-input": {
    label: "texto",
    accent: "var(--lab-node-copy)",
    Icon: FileText,
  },
  "asset-input": {
    label: "imagem-base do projeto",
    accent: "var(--lab-ctx-project)",
    Icon: Images,
  },
  prompt: {
    label: "prompt",
    accent: "var(--lab-node-image)",
    Icon: MessageSquareText,
  },
  "image-generation": {
    label: "gerar imagem",
    accent: "var(--lab-node-image)",
    Icon: WandSparkles,
  },
  "video-generation": {
    label: "animar imagem",
    accent: "var(--lab-node-video)",
    Icon: Clapperboard,
  },
  "video-extend": {
    label: "continuar clipe",
    accent: "var(--lab-node-video)",
    Icon: Clapperboard,
  },
  "video-assembly": {
    label: "juntar clipes",
    accent: "var(--lab-ctx-post)",
    Icon: Film,
  },
  text2video: {
    label: "texto para vídeo",
    accent: "var(--lab-node-video)",
    Icon: Clapperboard,
  },
  note: {
    label: "nota",
    accent: "var(--lab-node-utility)",
    Icon: StickyNote,
  },
  "asset-output": {
    label: "saída",
    accent: "var(--lab-node-utility)",
    Icon: UploadCloud,
  },
};

const imageModelOptions = FAL_IMAGE_MODELS.map((model) => ({
  id: model.id,
  name: model.name,
  unit: model.pricing.unit === "megapixel" ? "MP" : "img",
  unitPriceUsd: model.pricing.unitPriceUsd,
}));

// Entradas e saídas mostradas no tooltip do nó (espelham getCanvasPortType no canvas).
const nodeIoTags: Partial<Record<LabNodeKind, string[]>> = {
  "text-input": ["sai: texto"],
  prompt: ["sai: texto"],
  "image-generation": ["entra: texto", "sai: imagem"],
  "video-generation": ["entra: imagem", "sai: vídeo"],
  "video-extend": ["entra: vídeo", "sai: vídeo"],
  "video-assembly": ["entra: vídeo ×2+", "sai: vídeo", "áudio opcional"],
  text2video: ["entra: texto", "sai: vídeo"],
  "asset-input": ["sai: imagem ou vídeo"],
  "asset-output": ["entra: qualquer"],
};

export function getNodeCost(data: LabFlowNode["data"]): CostChipProps {
  const actual = getNumber(data.params?.actualCostBrl);
  if (actual !== undefined) return { state: "actual", value: actual };
  if (["text-input", "prompt", "note", "asset-input", "asset-output", "video-assembly"].includes(data.kind)) return { state: "free" };
  const label = data.costLabel ?? "";
  if (label === "indisponível") return { state: "unavailable" };
  const match = label.replace(/\s/g, "").match(/R\$([\d.]+,\d+)/);
  const estimated = match ? Number(match[1].replace(/\./g, "").replace(",", ".")) : undefined;
  return estimated === undefined ? { state: "pending" } : { state: "estimated", value: estimated };
}

function emitNodeDataChange() {
  window.dispatchEvent(new CustomEvent("lab-flow-node-data-change"));
}

type ProjectAssetOption = {
  assetId: string;
  url: string;
  type: string;
  origin: string;
  projectRole?: string;
};

function AssetInputControls({
  params,
  updateParams,
}: {
  params: Record<string, unknown>;
  updateParams: (nextParams: Record<string, unknown>) => void;
}) {
  const projectId = getString(params.projectId);
  const selectedAssetId = getString(params.assetId) ?? "";
  const [assets, setAssets] = useState<ProjectAssetOption[]>([]);
  const [loadError, setLoadError] = useState<string | undefined>();

  useEffect(() => {
    if (!projectId) {
      setAssets([]);
      return;
    }

    let cancelled = false;
    void fetch(`/api/projects/${projectId}/assets`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as {
          assets?: ProjectAssetOption[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "Não foi possível carregar os Assets do Projeto.");
        }
        if (!cancelled) {
          setAssets(
            (payload.assets ?? []).filter((asset) =>
              ["IMAGE", "VIDEO"].includes(asset.type),
            ),
          );
          setLoadError(undefined);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Assets indisponíveis.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const selectedAsset = assets.find((asset) => asset.assetId === selectedAssetId);

  return (
    <div className="mt-3 space-y-3">
      <label className="block">
        <span className="mb-1 block font-mono text-eyebrow uppercase text-lab-text-muted">
          Asset do Projeto
        </span>
        <select
          aria-label="Asset do Projeto"
          value={selectedAssetId}
          onChange={(event) => {
            const asset = assets.find((item) => item.assetId === event.target.value);
            updateParams({
              assetId: asset?.assetId || undefined,
              projectRole: asset?.projectRole || undefined,
              assetType: asset?.type || undefined,
              assetUrl: undefined,
              pending: !asset,
            });
          }}
          className="nodrag nowheel h-9 w-full rounded-control border border-lab-border bg-lab-surface-1 px-2 text-xs text-lab-text outline-none transition-colors focus:border-lab-border-strong focus:shadow-lab-focus"
        >
          <option value="">Selecione uma imagem-base</option>
          {assets.map((asset, index) => (
            <option key={asset.assetId} value={asset.assetId}>
              {asset.projectRole === "reference" ? "Referência" : "Imagem-base"} · {asset.type === "VIDEO" ? "Vídeo" : "Imagem"} {index + 1}
            </option>
          ))}
        </select>
      </label>

      <div className="rounded-control border border-lab-border bg-lab-surface-1 px-2.5 py-2">
        <CostChip state="free" size="sm" />
        <div className="mt-1 text-xs leading-5 text-lab-text-dim">
          {selectedAsset
            ? selectedAsset.projectRole === "reference"
              ? "Referência visual: não vira primeiro frame."
              : "Imagem-base selecionada para Animar imagem."
            : projectId
              ? "Selecione uma imagem-base importado no Projeto."
              : "Este Flow ainda não está ligado a um Projeto."}
        </div>
      </div>

      {selectedAsset ? (
        <div className="overflow-hidden rounded-control border border-lab-border bg-lab-surface-1">
          {selectedAsset.type === "VIDEO" ? (
            <video src={selectedAsset.url} controls className="aspect-video w-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selectedAsset.url} alt="Asset selecionado do Projeto" className="aspect-square w-full object-cover" />
          )}
        </div>
      ) : null}

      {loadError ? (
        <p className="rounded-control border border-lab-danger/40 bg-lab-surface-1 px-2 py-1.5 text-xs text-lab-danger">
          {loadError}
        </p>
      ) : null}
    </div>
  );
}

function AssemblyControls({
  params,
  updateParams,
}: {
  params: Record<string, unknown>;
  updateParams: (nextParams: Record<string, unknown>) => void;
}) {
  const assetUrl = getString(params.assetUrl);
  const assemblyStatus = getString(params.assemblyStatus);
  const audioAssetId = getString(params.audioAssetId);
  const audioAssetName = getString(params.audioAssetName);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [audioUploadError, setAudioUploadError] = useState<string | undefined>();

  async function uploadAudioTrack(file: File) {
    setIsUploadingAudio(true);
    setAudioUploadError(undefined);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/assets/upload", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => ({}))) as {
        assetId?: string;
        url?: string;
        error?: string;
      };

      if (!response.ok || !payload.assetId || !payload.url) {
        throw new Error(payload.error ?? "Não foi possível enviar o áudio.");
      }

      updateParams({
        audioAssetId: payload.assetId,
        audioAssetUrl: payload.url,
        audioAssetName: file.name,
      });
    } catch (error) {
      setAudioUploadError(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar o áudio.",
      );
    } finally {
      setIsUploadingAudio(false);
    }
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-control border border-lab-border bg-lab-surface-1 px-2.5 py-2">
        <p className="text-xs leading-5 text-lab-text-dim">
          Conecte os clipes na ordem da esquerda para a direita.
        </p>
        <div className="mt-2 flex items-center gap-2"><CostChip state="free" size="sm" /><span className="text-caption text-lab-text-dim">montagem local</span></div>
      </div>

      <div className="rounded-control border border-lab-border bg-lab-surface-1 px-2.5 py-2">
        <label className="block">
          <span className="mb-1 block font-mono text-eyebrow uppercase text-lab-text-muted">
            Trilha/voz (opcional)
          </span>
          <input
            data-id="assembly-audio-upload"
            type="file"
            accept="audio/*"
            disabled={isUploadingAudio}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";

              if (file) {
                void uploadAudioTrack(file);
              }
            }}
            className="nodrag nowheel block w-full text-xs text-lab-text file:mr-2 file:rounded-control file:border-0 file:bg-lab-surface-1 file:px-2 file:py-1.5 file:font-mono file:text-eyebrow file:text-lab-text-dim hover:file:bg-lab-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <div className="mt-2 flex min-h-7 items-center justify-between gap-2">
          <span className="min-w-0 truncate text-xs text-lab-text-dim">
            {isUploadingAudio
              ? "Enviando áudio..."
              : audioAssetId
                ? audioAssetName ?? "Áudio carregado"
                : "Nenhuma trilha carregada."}
          </span>
          {audioAssetId ? (
            <button
              type="button"
              onClick={() =>
                updateParams({
                  audioAssetId: undefined,
                  audioAssetUrl: undefined,
                  audioAssetName: undefined,
                })
              }
              className="nodrag shrink-0 rounded-control border border-lab-border px-2 py-1 font-mono text-eyebrow text-lab-text-dim transition-colors hover:border-lab-border-strong hover:text-lab-text"
            >
              Remover
            </button>
          ) : null}
        </div>

        {audioUploadError ? (
          <p className="mt-2 rounded-control border border-lab-danger/40 bg-lab-surface-2 px-2 py-1.5 text-xs text-lab-danger">
            {audioUploadError}
          </p>
        ) : null}
      </div>

      {assetUrl ? (
        <div className="overflow-hidden rounded-control border border-lab-border bg-lab-surface-1">
          <video src={assetUrl} controls className="aspect-video w-full object-cover" />
        </div>
      ) : (
        <div className="flex h-20 items-center justify-center rounded-control border border-dashed border-lab-border bg-lab-surface-1 px-3 text-center text-xs text-lab-text-muted">
          {assemblyStatus === "done"
            ? "vídeo montado indisponível"
            : "A montagem exige pelo menos dois clipes."}
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

export function LabFlowNodeComponent({
  id,
  data,
  selected,
}: NodeProps<LabFlowNode>) {
  const meta = nodeMeta[data.kind];
  const Icon = meta.Icon;
  const { setNodes } = useReactFlow<LabFlowNode>();
  const params = data.params ?? {};
  const selectedImageProvider = getString(params.providerId) ?? "fal";
  const selectedImageModel =
    getString(params.model) ??
    (selectedImageProvider === "fal" ? imageModelOptions[0]?.id ?? "fal-ai/flux/dev" : "");
  const selectedImageModelInfo =
    imageModelOptions.find((model) => model.id === selectedImageModel) ??
    imageModelOptions[0];
  const assetUrl = getString(params.assetUrl);
  const generationStatus = getString(params.generationStatus);
  const cost = getNodeCost(data);
  const nodeState: NodeState = data.status === "failed" ? "error"
    : data.status === "running" ? "running"
    : data.status === "done" ? "ready"
    : data.status === "queued" || params.pending === true ? "blocked"
    : selected ? "selected" : "idle";
  const isMediaNode = ["image-generation", "video-generation", "text2video", "video-extend", "video-assembly"].includes(data.kind);
  const modelName = data.kind === "image-generation"
    ? selectedImageProvider === "fal" ? selectedImageModelInfo?.name : getString(params.model)
    : videoModelOptions.find((model) => model.id === getString(params.model))?.name;

  function updateParams(nextParams: Record<string, unknown>) {
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                params: {
                  ...(node.data.params ?? {}),
                  ...nextParams,
                },
              },
            }
          : node,
      ),
    );
    emitNodeDataChange();
  }

  return (
    <LabNodeShell
      state={nodeState}
      accent={meta.accent}
      Icon={Icon}
      title={data.title}
      kindLabel={meta.label}
      cost={cost}
      progressLabel="Gerando…"
      hint={{ description: data.description, tags: nodeIoTags[data.kind] ?? [] }}
      errorMessage={getString(params.errorMessage) ?? "Não foi possível concluir este nó. Revise a configuração antes de executar novamente."}
      blockedReason={data.status === "queued" ? "Aguardando execução" : "Escolha uma imagem-base do Projeto"}
      ports={<>
        {!["asset-input", "text-input", "prompt"].includes(data.kind) ? <Handle type="target" position={Position.Left} className="!left-[-8px]" /> : null}
        {data.kind === "asset-input" ? <>
          <Handle id="image" type="source" position={Position.Right} className="!right-[-8px] !top-[42%]" />
          <Handle id="video" type="source" position={Position.Right} className="!right-[-8px] !top-[58%]" />
        </> : data.kind !== "asset-output" ? <Handle type="source" position={Position.Right} className="!right-[-8px]" /> : null}
      </>}
    >
      {isMediaNode ? <>
        <div className="overflow-hidden rounded-control border border-lab-border bg-lab-surface-1">
          {assetUrl ? data.kind === "image-generation" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={assetUrl} alt={data.title} className="aspect-video w-full object-cover" />
          ) : <video src={assetUrl} controls preload="metadata" aria-label={data.title} className="nodrag nowheel aspect-video w-full object-cover" />
            : <div className="grid aspect-video place-items-center border border-dashed border-lab-border px-3 text-center font-mono text-eyebrow text-lab-text-muted">{generationStatus && generationStatus !== "done" ? nodeStatusLabel(generationStatus) : "resultado aparece aqui"}</div>}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5 font-mono text-eyebrow text-lab-text-dim">
          {modelName ? <span className="max-w-full truncate rounded-full border border-lab-border px-2 py-0.5">{modelName}</span> : null}
          {getString(params.duration) ? <span className="rounded-full border border-lab-border px-2 py-0.5">{getString(params.duration)?.replace(/s$/i, "")}s</span> : null}
          {getString(params.aspect_ratio) ? <span className="rounded-full border border-lab-border px-2 py-0.5">{getString(params.aspect_ratio)}</span> : null}
        </div>
      </> : null}
      {data.kind === "text-input" || data.kind === "note" ? <textarea
        aria-label={data.kind === "note" ? "Anotação" : "Briefing"}
        value={getString(params.text) ?? ""}
        onChange={(event) => updateParams({ text: event.target.value })}
        placeholder={data.description}
        className="nodrag nowheel h-24 w-full resize-none rounded-control border border-lab-border bg-lab-surface-1 px-3 py-2 font-mono text-xs leading-5 text-lab-text outline-none placeholder:text-lab-text-muted focus-visible:shadow-lab-focus"
      /> : null}
      {isMediaNode ? <details className="nodrag nowheel mt-3 border-t border-lab-border pt-2">
        <summary className="cursor-pointer text-xs text-lab-text-dim outline-none focus-visible:shadow-lab-focus">Configurar nó</summary>
        {renderSettings()}
      </details> : renderSettings()}
    </LabNodeShell>
  );

  function renderSettings() {
    return <>
        {data.kind === "prompt" ? (
          <textarea
            aria-label="Prompt"
            value={getString(params.prompt) ?? ""}
            onChange={(event) => updateParams({ prompt: event.target.value })}
            placeholder="Descreva a imagem..."
            className="nodrag nowheel mt-3 h-24 w-full resize-none rounded-control border border-lab-border bg-lab-surface-1 px-3 py-2 font-mono text-xs leading-5 text-lab-text outline-none transition-colors placeholder:text-lab-text-muted focus:border-lab-border-strong focus:shadow-lab-focus"
          />
        ) : null}

        {data.kind === "asset-input" ? (
          <AssetInputControls params={params} updateParams={updateParams} />
        ) : null}

        {data.kind === "image-generation" ? (
          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="mb-1 block font-mono text-eyebrow uppercase text-lab-text-muted">
                provider
              </span>
              <select
                aria-label="Provider de imagem"
                value={selectedImageProvider}
                onChange={(event) =>
                  updateParams(
                    event.target.value === "fal"
                      ? { providerId: "fal", connectionId: undefined, model: imageModelOptions[0]?.id }
                      : { providerId: "openai", connectionId: undefined, model: undefined },
                  )
                }
                className="nodrag nowheel h-9 w-full rounded-control border border-lab-border bg-lab-surface-1 px-2 text-xs text-lab-text outline-none transition-colors focus:border-lab-border-strong"
              >
                <option value="fal">fal.ai</option>
                <option value="openai">OpenAI / ChatGPT</option>
              </select>
            </label>

            {selectedImageProvider === "openai" ? (
              <>
                <label className="block">
                  <span className="mb-1 block font-mono text-eyebrow uppercase text-lab-text-muted">
                    conexão ChatGPT
                  </span>
                  <input
                    aria-label="Conexão ChatGPT"
                    value={getString(params.connectionId) ?? ""}
                    onChange={(event) => updateParams({ connectionId: event.target.value || undefined })}
                    placeholder="ID da conexão autenticada"
                    className="nodrag nowheel h-9 w-full rounded-control border border-lab-border bg-lab-surface-1 px-2 font-mono text-xs text-lab-text outline-none placeholder:text-lab-text-muted focus:border-lab-border-strong"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block font-mono text-eyebrow uppercase text-lab-text-muted">
                    modelo homologado
                  </span>
                  <input
                    aria-label="Modelo OpenAI"
                    value={getString(params.model) ?? ""}
                    onChange={(event) => updateParams({ model: event.target.value || undefined })}
                    placeholder="Disponível após contrato de imagem"
                    className="nodrag nowheel h-9 w-full rounded-control border border-lab-border bg-lab-surface-1 px-2 font-mono text-xs text-lab-text outline-none placeholder:text-lab-text-muted focus:border-lab-border-strong"
                  />
                </label>
                <p className="rounded-control border border-lab-warning/40 bg-lab-surface-1 px-2 py-1.5 text-xs leading-5 text-lab-warning">
                  Selecione uma conexão autenticada e um modelo disponível para sua conta.
                </p>
              </>
            ) : null}

            {selectedImageProvider === "fal" ? (
            <label className="block">
              <span className="mb-1 block font-mono text-eyebrow uppercase text-lab-text-muted">
                modelo
              </span>
              <select
                aria-label="Modelo de imagem"
                value={selectedImageModel}
                onChange={(event) => updateParams({ model: event.target.value })}
                className="nodrag nowheel h-9 w-full rounded-control border border-lab-border bg-lab-surface-1 px-2 text-xs text-lab-text outline-none transition-colors focus:border-lab-border-strong focus:shadow-lab-focus"
              >
                {imageModelOptions.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </label>
            ) : null}

            {selectedImageProvider === "fal" && selectedImageModelInfo ? (
              <div className="flex items-center justify-between gap-2 rounded-control border border-lab-border bg-lab-surface-1 px-2.5 py-2">
                <span className="truncate font-mono text-eyebrow text-lab-text-dim">
                  {selectedImageModelInfo.name}
                </span>
                <span className="shrink-0">
                  <CostChip state="pending" size="sm" />
                </span>
              </div>
            ) : null}

            {assetUrl ? (
              <div className="overflow-hidden rounded-control border border-lab-border bg-lab-surface-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={assetUrl}
                  alt="Imagem gerada"
                  className="aspect-square w-full object-cover"
                />
              </div>
            ) : generationStatus ? (
              <div className="flex h-28 items-center justify-center rounded-control border border-dashed border-lab-border bg-lab-surface-1 text-xs text-lab-text-muted">
                {generationStatus === "done"
                  ? "imagem indisponível"
                  : nodeStatusLabel(generationStatus)}
              </div>
            ) : (
              <div className="flex h-20 items-center justify-center rounded-control border border-dashed border-lab-border bg-lab-surface-1 text-center text-xs text-lab-text-muted">
                Conecte um Prompt e execute.
              </div>
            )}

            {getString(params.errorMessage) ? (
              <p className="rounded-control border border-lab-danger/40 bg-lab-surface-1 px-2 py-1.5 text-xs text-lab-danger">
                {getString(params.errorMessage)}
              </p>
            ) : null}
          </div>
        ) : null}

        {data.kind === "video-extend" && (data.extendChainDepth ?? 0) >= 6 ? (
          <div className="mt-3 flex gap-2 rounded-control border border-lab-warning/50 bg-lab-surface-1 px-2.5 py-2 text-xs leading-5 text-lab-warning">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              {data.extendChainDepth}º encadeamento - qualidade tende a
              degradar acima de ~60s.
            </span>
          </div>
        ) : null}

        {data.kind === "video-generation" ||
        data.kind === "text2video" ||
        data.kind === "video-extend" ? (
          <VideoControls
            params={params}
            updateParams={updateParams}
            mode={
              data.kind === "video-generation"
                ? "image"
                : data.kind === "video-extend"
                  ? "extend"
                  : "text"
            }
          />
        ) : null}

        {data.kind === "video-assembly" ? (
          <AssemblyControls params={params} updateParams={updateParams} />
        ) : null}
    </>;
  }
}
