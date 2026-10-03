import type { Connection } from "@xyflow/react";
import type { FlowGraph, LabNodeKind } from "@/lib/flows/graph";

const portNoun = {
  text: { one: "um texto", many: "textos" },
  image: { one: "uma imagem", many: "imagens" },
  video: { one: "um vídeo", many: "vídeos" },
} as const;

// Suggest the intermediate node when output and input types do not connect directly.
const portBridge: Partial<Record<string, string>> = {
  "image>video": "Animar imagem",
  "text>image": "Gerar imagem",
};

export function getCanvasConnectionHint(
  graph: FlowGraph,
  connection: Connection,
): { message: string; suggestion: string | null } | null {
  if (!connection.source || !connection.target) {
    return { message: "Selecione origem e destino para conectar os nós.", suggestion: null };
  }

  const sourceNode = graph.nodes.find((node) => node.id === connection.source);
  const targetNode = graph.nodes.find((node) => node.id === connection.target);

  if (!sourceNode || !targetNode) {
    return { message: "Nó de origem ou destino não existe no grafo.", suggestion: null };
  }

  const sourceType = getCanvasPortType(sourceNode.data.kind, "source", connection.sourceHandle);
  const targetType = getCanvasPortType(targetNode.data.kind, "target", connection.targetHandle);

  if (!sourceType || !targetType) {
    return { message: "Porta de origem ou destino não existe.", suggestion: null };
  }

  if (sourceType === "any" || targetType === "any" || sourceType === targetType) {
    return null;
  }

  const target = portNoun[targetType as keyof typeof portNoun];
  const source = portNoun[sourceType as keyof typeof portNoun];
  return {
    message: `${targetNode.data.title} recebe ${target?.many ?? targetType}, e isto é ${source?.one ?? sourceType}.`,
    suggestion: portBridge[`${sourceType}>${targetType}`] ?? null,
  };
}

export function getCanvasConnectionFeedback(graph: FlowGraph, connection: Connection) {
  return getCanvasConnectionHint(graph, connection)?.message ?? null;
}

function getCanvasPortType(
  kind: LabNodeKind,
  direction: "source" | "target",
  handleId: string | null | undefined,
) {
  if (kind === "asset-input" && direction === "source") {
    return handleId === "video" ? "video" : handleId === "image" ? "image" : undefined;
  }

  if (direction === "target") {
    if (kind === "image-generation" || kind === "text2video") return "text";
    if (kind === "video-generation") return "image";
    if (kind === "video-extend" || kind === "video-assembly") return "video";
    if (kind === "asset-output" || kind === "note") return "any";
    return undefined;
  }

  if (kind === "text-input" || kind === "prompt") return "text";
  if (kind === "image-generation") return "image";
  if (kind === "video-generation" || kind === "video-extend" || kind === "video-assembly" || kind === "text2video") return "video";
  if (kind === "note") return "any";
  return undefined;
}
