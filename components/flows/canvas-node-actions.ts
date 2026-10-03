import { Clapperboard, Film, FileText, Image as ImageIcon, MessageSquareText, StickyNote, UploadCloud } from "lucide-react";

import type { CreateAction } from "@/components/flows/create-node-menu";
import type { LabFlowNode, LabNodeKind } from "@/lib/flows/graph";
import type { SerializableNodeDefinition } from "@/lib/flows/types";
import { PAID_VIDEO_KINDS } from "@/lib/flows/video-cost-gate";

const nodeIcons: Record<LabNodeKind, typeof FileText> = {
  "text-input": FileText,
  "asset-input": UploadCloud,
  prompt: MessageSquareText,
  "image-generation": ImageIcon,
  "video-generation": Clapperboard,
  "video-extend": Clapperboard,
  "video-assembly": Film,
  text2video: Clapperboard,
  note: StickyNote,
  "asset-output": UploadCloud,
};


export const paidNodeKindSet = new Set<string>([...PAID_VIDEO_KINDS, "image-generation"]);


export const createActionSections: Array<{
  label: string;
  actions: CreateAction[];
}> = [
  {
    label: "Criar",
    actions: [
      {
        id: "prompt",
        label: "Prompt",
        description: "Escreva a intenção do próximo passo.",
        kind: "prompt",
        icon: MessageSquareText,
      },
      {
        id: "image-generation",
        label: "Gerar imagem",
        description: "Crie uma imagem com custo visível.",
        kind: "image-generation",
        icon: ImageIcon,
      },
      {
        id: "video-generation",
        label: "Animar imagem",
        description: "Transforme uma imagem em clipe.",
        kind: "video-generation",
        icon: Clapperboard,
      },
      {
        id: "import-base-image",
        label: "Importar imagem-base",
        description: "Adicione JPG, PNG ou WebP ao Projeto.",
        kind: "asset-input",
        icon: UploadCloud,
      },
    ],
  },
  {
    label: "Projeto",
    actions: [
      {
        id: "project-assets",
        label: "Assets do Projeto",
        description: "Escolha uma fonte já importada.",
        kind: "asset-input",
        icon: UploadCloud,
      },
    ],
  },
  {
    label: "Pós-produção",
    actions: [
      {
        id: "video-extend",
        label: "Continuar clipe",
        description: "Continue uma cena a partir do último frame.",
        kind: "video-extend",
        icon: Clapperboard,
      },
      {
        id: "video-assembly",
        label: "Juntar clipes",
        description: "Feche um vídeo com várias cenas.",
        kind: "video-assembly",
        icon: Film,
      },
    ],
  },
  {
    label: "Direção",
    actions: [],
  },
];

export const compatibilityActions: CreateAction[] = [
  {
    id: "note",
    label: "Nota",
    description: "Anotação livre no fluxo.",
    kind: "note",
    icon: StickyNote,
  },
];

export const priorityCreateActionIds = new Set(["import-base-image", "project-assets"]);

export const assetInputDefinition: SerializableNodeDefinition = {
  type: "asset-input",
  label: "Asset importado",
  description: "Conecte este Asset à entrada de Animar imagem.",
  inputs: [],
  outputs: [
    { id: "image", label: "Imagem", type: "image" },
    { id: "video", label: "Vídeo", type: "video" },
  ],
  ui: { componentKey: "labNode", kind: "asset-input" },
};

function isLabNodeKind(kind: string): kind is LabNodeKind {
  return kind in nodeIcons;
}

function getDefaultParams(kind: LabNodeKind) {
  if (kind === "prompt") {
    return { prompt: "" };
  }

  if (kind === "asset-input") {
    return { assetId: "", projectRole: "source", pending: true };
  }

  if (kind === "image-generation") {
    return { model: "fal-ai/flux/dev" };
  }

  if (kind === "video-generation") {
    return {
      model: "fal-ai/wan-25-preview/image-to-video",
      prompt: "",
      duration: "5",
      resolution: "1080p",
    };
  }

  if (kind === "video-extend") {
    return {
      model: "fal-ai/wan-25-preview/image-to-video",
      prompt: "",
      sceneContext: "",
      duration: "5",
      resolution: "1080p",
    };
  }

  if (kind === "video-assembly") {
    return {};
  }

  if (kind === "text2video") {
    return {
      model: "fal-ai/wan-25-preview/image-to-video",
      prompt: "",
      duration: "5",
      resolution: "1080p",
    };
  }

  return undefined;
}

export function createNode(
  definition: SerializableNodeDefinition,
  position: { x: number; y: number },
  projectId?: string,
) {
  const kind = isLabNodeKind(definition.ui.kind)
    ? definition.ui.kind
    : "note";
  const suffix = crypto.randomUUID().slice(0, 8);

  return {
    id: `${kind}-${suffix}`,
    type: "labNode",
    position,
    data: {
      kind,
      title: definition.label ?? "Nó",
      description: definition.description ?? "Nó do fluxo.",
      status: "idle",
      params: {
        ...(getDefaultParams(kind) ?? {}),
        ...(kind === "asset-input" && projectId ? { projectId } : {}),
      },
    },
  } satisfies LabFlowNode;
}

export function createActionDefinition(action: CreateAction): SerializableNodeDefinition {
  if (action.kind === "asset-input") {
    return {
      ...assetInputDefinition,
      label: action.label,
      description: action.description,
    };
  }

  return {
    type: action.kind,
    label: action.label,
    description: action.description,
    inputs: [],
    outputs: [],
    ui: { componentKey: "labNode", kind: action.kind },
  };
}

const NEW_NODE_WIDTH = 288;
const NEW_NODE_HEIGHT = 480;
const NEW_NODE_GAP = 32;

type NodeRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function getNodeRect(node: LabFlowNode): NodeRect {
  const measured = (node as LabFlowNode & { measured?: { width?: number; height?: number } }).measured;
  const dimensions = node as LabFlowNode & { width?: number; height?: number };

  return {
    x: node.position.x,
    y: node.position.y,
    width: measured?.width ?? dimensions.width ?? NEW_NODE_WIDTH,
    height: measured?.height ?? dimensions.height ?? NEW_NODE_HEIGHT,
  };
}

function overlapsWithGap(candidate: NodeRect, existing: NodeRect) {
  return (
    candidate.x < existing.x + existing.width + NEW_NODE_GAP &&
    candidate.x + candidate.width + NEW_NODE_GAP > existing.x &&
    candidate.y < existing.y + existing.height + NEW_NODE_GAP &&
    candidate.y + candidate.height + NEW_NODE_GAP > existing.y
  );
}

export function findFreeNodePosition(
  nodes: LabFlowNode[],
  anchor: { x: number; y: number },
) {
  const existingRects = nodes.map(getNodeRect);
  const cellWidth =
    Math.max(NEW_NODE_WIDTH, ...existingRects.map((rect) => rect.width)) +
    NEW_NODE_GAP;
  const cellHeight =
    Math.max(NEW_NODE_HEIGHT, ...existingRects.map((rect) => rect.height)) +
    NEW_NODE_GAP;
  const origin = {
    x: anchor.x - NEW_NODE_WIDTH / 2,
    y: anchor.y - NEW_NODE_HEIGHT / 2,
  };

  for (let radius = 0; radius <= nodes.length + 1; radius += 1) {
    for (let y = -radius; y <= radius; y += 1) {
      for (let x = -radius; x <= radius; x += 1) {
        if (Math.max(Math.abs(x), Math.abs(y)) !== radius) {
          continue;
        }

        const candidate = {
          x: origin.x + x * cellWidth,
          y: origin.y + y * cellHeight,
          width: NEW_NODE_WIDTH,
          height: NEW_NODE_HEIGHT,
        };

        if (!existingRects.some((rect) => overlapsWithGap(candidate, rect))) {
          return { x: candidate.x, y: candidate.y };
        }
      }
    }
  }

  return origin;
}
