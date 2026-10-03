"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  MarkerType,
  MiniMap,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
} from "@xyflow/react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Monitor,
  RotateCcw,
  X,
  Loader2,
  Play,
  Plus,
  Save,
} from "lucide-react";

import {
  CostConfirmModal,
  type CostConfirmItem,
} from "@/components/flows/cost-confirm-modal";
import { CreateNodeMenu, type CreateAction } from "@/components/flows/create-node-menu";
import { InvalidEdgeHint } from "@/components/flows/invalid-edge-hint";
import { LabFlowNodeComponent } from "@/components/nodes/lab-flow-node";
import { CostChip } from "@/components/ui/cost-chip";
import { Button } from "@/components/ui/button";
import {
  type FlowGraph,
  type LabFlowNode,
  type LabNodeKind,
} from "@/lib/flows/graph";
import { countConsecutiveVideoExtends } from "@/lib/flows/video-chain";
import type { SerializableNodeDefinition } from "@/lib/flows/types";
import { cn } from "@/lib/utils";
import {
  assetInputDefinition,
  compatibilityActions,
  createActionDefinition,
  createActionSections,
  createNode,
  findFreeNodePosition,
  paidNodeKindSet,
  priorityCreateActionIds,
} from "@/components/flows/canvas-node-actions";
import { getCanvasConnectionHint } from "@/components/flows/canvas-connections";
export { getCanvasConnectionHint, getCanvasConnectionFeedback } from "@/components/flows/canvas-connections";

type FlowRecord = {
  id: string;
  name: string;
  graph: FlowGraph;
  updatedAt: string;
  projectId?: string | null;
};

type FlowResponse = {
  flow: FlowRecord;
};

type CostResponse = {
  cost: {
    total: {
      brl: number;
    };
    nodes: Array<{
      nodeId: string;
      type: string;
      estimatedCost: {
        brl: number;
      };
    }>;
  };
  confirmation?: { token: string; expiresAt: number };
};

type FlowRunResponse = {
  flowRun: {
    id: string;
    status: string;
    nodes: Array<{
      nodeId: string;
      type: string;
      status: string;
      outputs: unknown;
      error: string | null;
      estimatedCost: {
        brl: number;
      };
      actualCost: {
        brl: number;
      };
    }>;
  };
};

type LatestFlowRunResponse = {
  flowRun: FlowRunResponse["flowRun"] | null;
};

type GenerationResponse = {
  generation: {
    id: string;
    status: string;
    model: string;
    prompt: string;
    actualCostBrl: number | null;
    errorMessage: string | null;
    assets: Array<{
      id: string;
      url: string;
      width: number | null;
      height: number | null;
    }>;
  };
};

type CostConfirmState = {
  open: boolean;
  isLoading: boolean;
  cost: CostResponse["cost"] | null;
  errorMessage: string | null;
  confirmationToken: string | null;
};

const nodeTypes = {
  labNode: LabFlowNodeComponent,
} satisfies NodeTypes;

type CanvasProjectAsset = {
  assetId: string;
  type: string;
  projectRole?: string;
  url?: string;
  metadata?: { originalFileName?: string | null; projectRole?: string } | null;
};

type PendingProjectAction = "import-base-image" | "project-assets" | null;

function formatBrl(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value).replace(/\s/g, "");
}

function getRecord(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function FlowCanvasInner({ flowId }: { flowId: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<LabFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [flowName, setFlowName] = useState("Novo experimento");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isNodeMenuOpen, setIsNodeMenuOpen] = useState(false);
  const [createSearch, setCreateSearch] = useState("");
  const [isImportingAsset, setIsImportingAsset] = useState(false);
  const [isProjectAssetPickerOpen, setIsProjectAssetPickerOpen] = useState(false);
  const [projectAssets, setProjectAssets] = useState<CanvasProjectAsset[]>([]);
  const [projectAssetsError, setProjectAssetsError] = useState<string | null>(null);
  const [pendingProjectAction, setPendingProjectAction] = useState<PendingProjectAction>(null);
  const [isCreatingProjectForFlow, setIsCreatingProjectForFlow] = useState(false);
  const [flowProjectName, setFlowProjectName] = useState("");
  const [flowProjectObjective, setFlowProjectObjective] = useState("");
  const [flowProjectError, setFlowProjectError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [costLabel, setCostLabel] = useState("A calcular");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [projectDisplayName, setProjectDisplayName] = useState("Projeto");
  const [costConfirm, setCostConfirm] = useState<CostConfirmState>({
    open: false,
    isLoading: false,
    cost: null,
    errorMessage: null,
    confirmationToken: null,
  });
  const costConfirmRequestRef = useRef(0);
  const flowLoadedRef = useRef(false);
  const flowProjectIdRef = useRef<string | undefined>(undefined);
  const ensureProjectPromiseRef = useRef<Promise<string> | null>(null);
  const assetFileInputRef = useRef<HTMLInputElement>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [flowProjectId, setFlowProjectId] = useState<string | undefined>();
  const [connectionHint, setConnectionHint] = useState<{ message: string; suggestion: string | null } | null>(null);
  const [connectionHintAt, setConnectionHintAt] = useState<{ x: number; y: number } | null>(null);
  const { fitView, getViewport, screenToFlowPosition, setViewport } =
    useReactFlow<LabFlowNode, Edge>();
  const normalizedCreateSearch = createSearch.trim().toLocaleLowerCase("pt-BR");
  const matchesCreateSearch = useCallback(
    (action: CreateAction) =>
      !normalizedCreateSearch ||
      `${action.label} ${action.description}`
        .toLocaleLowerCase("pt-BR")
        .includes(normalizedCreateSearch),
    [normalizedCreateSearch],
  );
  const priorityCreateActions = useMemo(
    () =>
      createActionSections
        .flatMap((section) => section.actions)
        .filter((action) => priorityCreateActionIds.has(action.id) && matchesCreateSearch(action)),
    [matchesCreateSearch],
  );
  const visibleCreateSections = useMemo(
    () =>
      createActionSections
        .map((section) => ({
          ...section,
          actions: section.actions.filter(
            (action) =>
              !priorityCreateActionIds.has(action.id) && matchesCreateSearch(action),
          ),
        }))
        .filter(
          (section) =>
            section.actions.length > 0 ||
            (section.label === "Direção" && !normalizedCreateSearch),
        ),
    [matchesCreateSearch, normalizedCreateSearch],
  );
  const visibleCompatibilityActions = useMemo(
    () => compatibilityActions.filter(matchesCreateSearch),
    [matchesCreateSearch],
  );
  const nodesWithExtendDepth = useMemo(
    () =>
      nodes.map((node) => {
        if (node.data.kind !== "video-extend") {
          return node;
        }

        const extendChainDepth = countConsecutiveVideoExtends({
          nodes,
          edges,
          nodeId: node.id,
        });

        if (node.data.extendChainDepth === extendChainDepth) {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            extendChainDepth,
          },
        };
      }),
    [edges, nodes],
  );
  const costConfirmItems = useMemo<CostConfirmItem[]>(() => {
    if (!costConfirm.cost) {
      return [];
    }

    const nodesById = new Map(nodes.map((node) => [node.id, node]));

    return costConfirm.cost.nodes
      .filter((nodeCost) => paidNodeKindSet.has(nodeCost.type))
      .map((nodeCost) => {
        const node = nodesById.get(nodeCost.nodeId);

        return {
          nodeId: nodeCost.nodeId,
          label: node?.data.title ?? nodeCost.nodeId,
          kind: (node?.data.kind ?? nodeCost.type) as LabNodeKind,
          brl: nodeCost.estimatedCost.brl,
        };
      });
  }, [costConfirm.cost, nodes]);

  useEffect(() => {
    const markDirty = () => {
      setIsDirty(true);
      setRunMessage(null);
    };

    window.addEventListener("lab-flow-node-data-change", markDirty);
    return () => window.removeEventListener("lab-flow-node-data-change", markDirty);
  }, []);

  useEffect(() => {
    if (!flowProjectId) return;
    let cancelled = false;
    void fetch(`/api/projects/${flowProjectId}`, { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((payload: { project?: { name?: string } } | null) => {
        if (!cancelled && payload?.project?.name) setProjectDisplayName(payload.project.name);
      }).catch(() => {});
    return () => { cancelled = true; };
  }, [flowProjectId]);

  useEffect(() => {
    if (!isNodeMenuOpen) return;
    const dismiss = (event: KeyboardEvent) => { if (event.key === "Escape") setIsNodeMenuOpen(false); };
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, [isNodeMenuOpen]);

  const fetchFlowCost = useCallback(
    async (graph: FlowGraph) => {
      const response = await fetch(`/api/flows/${flowId}/cost`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          graph,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Não foi possível estimar o custo do fluxo.");
      }

      return (await response.json()) as CostResponse;
    },
    [flowId],
  );

  const applyCostEstimate = useCallback(
    (payload: CostResponse) => {
      setCostLabel(`${payload.cost.total.brl > 0 ? "~" : ""}${formatBrl(payload.cost.total.brl)}`);
      setNodes((currentNodes) => {
        const costByNodeId = new Map(
          payload.cost.nodes.map((node) => [node.nodeId, node.estimatedCost.brl]),
        );
        let changed = false;
        const nextNodes = currentNodes.map((node) => {
          const brl = costByNodeId.get(node.id);
          const nextCostLabel = brl === undefined ? undefined : brl > 0 ? `~${formatBrl(brl)}` : formatBrl(0);

          if (node.data.costLabel === nextCostLabel) {
            return node;
          }

          changed = true;
          return {
            ...node,
            data: {
              ...node.data,
              costLabel: nextCostLabel,
            },
          };
        });

        return changed ? nextNodes : currentNodes;
      });
    },
    [setNodes],
  );

  const estimateCost = useCallback(
    async (graph: FlowGraph) => {
      try {
        const payload = await fetchFlowCost(graph);
        applyCostEstimate(payload);
        return payload;
      } catch {
        setCostLabel("indisponível");
        return null;
      }
    },
    [applyCostEstimate, fetchFlowCost],
  );

  const loadFlow = useCallback(async () => {
    flowLoadedRef.current = false;
    setIsLoading(true);
    setLoadError(null);
    setErrorMessage(null);

    const response = await fetch(`/api/flows/${flowId}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error ?? "Não foi possível carregar o fluxo.");
    }

    const payload = (await response.json()) as FlowResponse;
    const graph = payload.flow.graph;

    setFlowName(payload.flow.name);
    setFlowProjectId(payload.flow.projectId ?? undefined);
    flowProjectIdRef.current = payload.flow.projectId ?? undefined;
    setNodes(
      graph.nodes.map((node) =>
        node.data.kind === "asset-input" && payload.flow.projectId
          ? {
              ...node,
              data: {
                ...node.data,
                params: {
                  ...(node.data.params ?? {}),
                  projectId: payload.flow.projectId,
                },
              },
            }
          : node,
      ),
    );
    setEdges(graph.edges);
    setIsDirty(false);
    flowLoadedRef.current = true;
    setLastSavedAt(
      new Date(payload.flow.updatedAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
    void estimateCost(graph);

    if (graph.viewport) {
      setViewport(graph.viewport);
    } else {
      window.requestAnimationFrame(() => fitView({ padding: 0.18 }));
    }

    setIsLoading(false);
  }, [estimateCost, fitView, flowId, setEdges, setNodes, setViewport]);

  useEffect(() => {
    loadFlow().catch((error: Error) => {
      setNodes([]);
      setEdges([]);
      setLoadError(error.message);
      setIsLoading(false);
    });
  }, [loadFlow, setEdges, setNodes]);

  useEffect(() => {
    if (isLoading || !flowLoadedRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      void estimateCost({
        nodes,
        edges,
        viewport: getViewport(),
      });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [edges, estimateCost, getViewport, isLoading, nodes]);

  const refreshGeneration = useCallback(
    async (generationId: string, nodeId: string, attempt = 0) => {
      const response = await fetch(`/api/generations/${generationId}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as GenerationResponse;
      const asset = payload.generation.assets[0];

      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  status:
                    payload.generation.status.toLowerCase() as LabFlowNode["data"]["status"],
                  params: {
                    ...(node.data.params ?? {}),
                    generationId,
                    generationStatus: payload.generation.status.toLowerCase(),
                    model: payload.generation.model,
                    prompt: payload.generation.prompt,
                    assetUrl: asset?.url,
                    assetWidth: asset?.width,
                    assetHeight: asset?.height,
                    actualCostBrl: payload.generation.actualCostBrl ?? undefined,
                    errorMessage: payload.generation.errorMessage ?? undefined,
                  },
                },
              }
            : node,
        ),
      );

      if (
        !["DONE", "FAILED"].includes(payload.generation.status) &&
        attempt < 30
      ) {
        window.setTimeout(
          () => void refreshGeneration(generationId, nodeId, attempt + 1),
          2000,
        );
      }
    },
    [setNodes],
  );

  const applyRunState = useCallback(
    (flowRun: FlowRunResponse["flowRun"]) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          const runNode = flowRun.nodes.find((item) => item.nodeId === node.id);

          if (!runNode) {
            return node;
          }

          const outputs = getRecord(runNode.outputs);
          const generationId =
            typeof outputs.generationId === "string"
              ? outputs.generationId
              : undefined;
          const output = getRecord(outputs.output);
          const assetId =
            typeof outputs.assetId === "string"
              ? outputs.assetId
              : typeof output.assetId === "string"
                ? output.assetId
                : undefined;
          const assetUrl =
            typeof outputs.url === "string"
              ? outputs.url
              : typeof output.url === "string"
                ? output.url
                : undefined;

          if (
            (node.data.kind === "image-generation" ||
              node.data.kind === "video-generation" ||
              node.data.kind === "video-extend" ||
              node.data.kind === "text2video") &&
            generationId
          ) {
            void refreshGeneration(generationId, node.id);
          }

          return {
            ...node,
            data: {
              ...node.data,
              status: runNode.status as LabFlowNode["data"]["status"],
              params: {
                ...(node.data.params ?? {}),
                generationId,
                queueJobId:
                  typeof outputs.queueJobId === "string"
                    ? outputs.queueJobId
                    : undefined,
                assetId,
                assetUrl,
                assemblyStatus:
                  node.data.kind === "video-assembly" && assetId
                    ? "done"
                    : undefined,
                generationStatus:
                  (node.data.kind === "image-generation" ||
                    node.data.kind === "video-generation" ||
                    node.data.kind === "video-extend" ||
                    node.data.kind === "text2video") &&
                  generationId
                    ? "queued"
                    : undefined,
                actualCostBrl: runNode.status === "done" && Number.isFinite(runNode.actualCost?.brl) ? runNode.actualCost.brl : undefined,
                errorMessage: runNode.error ?? undefined,
              },
            },
          };
        }),
      );
    },
    [refreshGeneration, setNodes],
  );

  const pollRun = useCallback(
    async (runId: string, attempt = 0) => {
      const response = await fetch(`/api/flows/${flowId}/runs/${runId}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as FlowRunResponse;
      applyRunState(payload.flowRun);

      if (!["done", "failed"].includes(payload.flowRun.status) && attempt < 20) {
        window.setTimeout(() => void pollRun(runId, attempt + 1), 1500);
      }
    },
    [applyRunState, flowId],
  );

  const rehydrateLatestRun = useCallback(async () => {
    const response = await fetch(`/api/flows/${flowId}/runs/latest`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as LatestFlowRunResponse;
    if (payload.flowRun) {
      applyRunState(payload.flowRun);

      if (!["done", "failed"].includes(payload.flowRun.status)) {
        void pollRun(payload.flowRun.id);
      }
    }
  }, [applyRunState, flowId, pollRun]);

  useEffect(() => {
    if (isLoading || !flowLoadedRef.current) {
      return;
    }

    void rehydrateLatestRun();
  }, [isLoading, rehydrateLatestRun]);

  useEffect(() => {
    if (!connectionHint) return;
    const timer = window.setTimeout(() => setConnectionHint(null), 6000);
    return () => window.clearTimeout(timer);
  }, [connectionHint]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const feedback = getCanvasConnectionHint(
        { nodes, edges },
        connection,
      );

      if (feedback) {
        setConnectionHint(feedback);
        setRunMessage(null);
        return;
      }

      setConnectionHint(null);
      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            id: `edge-${crypto.randomUUID()}`,
            type: "smoothstep",
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
          },
          currentEdges,
        ),
      );
      setIsDirty(true);
      setRunMessage(null);
    },
    [edges, nodes, setEdges],
  );

  const handleAddNode = useCallback(
    (definition: SerializableNodeDefinition) => {
      const anchor = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });

      setNodes((currentNodes) => [
        ...currentNodes,
        createNode(
          definition,
          findFreeNodePosition(currentNodes, anchor),
          flowProjectId,
        ),
      ]);
      setIsDirty(true);
      setRunMessage(null);
      setIsNodeMenuOpen(false);
    },
    [flowProjectId, screenToFlowPosition, setNodes],
  );

  const fillProjectAssetNode = useCallback(
    (asset: CanvasProjectAsset, projectId: string) => {
      const assetParams = {
        assetId: asset.assetId,
        assetType: asset.type,
        projectId,
        projectRole: asset.projectRole ?? "source",
        pending: false,
      };

      setNodes((currentNodes) => {
        const withProjectId = currentNodes.map((node) =>
          node.data.kind === "asset-input"
            ? {
                ...node,
                data: {
                  ...node.data,
                  params: {
                    ...(node.data.params ?? {}),
                    projectId,
                  },
                },
              }
            : node,
        );
        const target = withProjectId.find((node) => {
          if (node.data.kind !== "asset-input") return false;
          const params = (node.data.params ?? {}) as Record<string, unknown>;
          return typeof params.assetId !== "string" || params.assetId.trim().length === 0;
        });

        if (target) {
          return withProjectId.map((node) =>
            node.id === target.id
              ? { ...node, data: { ...node.data, params: { ...(node.data.params ?? {}), ...assetParams } } }
              : node,
          );
        }

        const anchor = screenToFlowPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        });
        const node = createNode(assetInputDefinition, findFreeNodePosition(withProjectId, anchor), projectId);
        return [
          ...withProjectId,
          { ...node, data: { ...node.data, params: { ...(node.data.params ?? {}), ...assetParams } } },
        ];
      });
      setIsDirty(true);
      setRunMessage(null);
      setIsNodeMenuOpen(false);
      setIsProjectAssetPickerOpen(false);
    },
    [screenToFlowPosition, setNodes],
  );

  const requestProjectForFlow = useCallback((action: Exclude<PendingProjectAction, null>) => {
    setPendingProjectAction(action);
    setFlowProjectName(flowName.trim() || "Novo Projeto");
    setFlowProjectObjective("");
    setFlowProjectError(null);
    setProjectAssetsError(null);
    setIsProjectAssetPickerOpen(action === "project-assets");
  }, [flowName]);

  const loadProjectAssets = useCallback(async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/assets`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        assets?: CanvasProjectAsset[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível carregar os Assets do Projeto.");
      }

      setProjectAssets(
        (payload.assets ?? []).filter((asset) =>
          ["IMAGE", "VIDEO"].includes(asset.type.toUpperCase()),
        ),
      );
    } catch (error) {
      setProjectAssetsError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os Assets do Projeto.",
      );
    }
  }, []);

  const openProjectAssetPicker = useCallback(async () => {
    if (!flowProjectId) {
      requestProjectForFlow("project-assets");
      return;
    }

    setProjectAssetsError(null);
    setIsProjectAssetPickerOpen(true);
    await loadProjectAssets(flowProjectId);
  }, [flowProjectId, loadProjectAssets, requestProjectForFlow]);

  const ensureFlowProject = useCallback(async () => {
    const knownProjectId = flowProjectIdRef.current ?? flowProjectId;
    if (knownProjectId) return knownProjectId;

    if (!ensureProjectPromiseRef.current) {
      ensureProjectPromiseRef.current = (async () => {
        const response = await fetch(`/api/flows/${flowId}/project`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: flowName.trim() || "Novo Projeto", objective: "" }),
        });
        const payload = (await response.json()) as { flow?: { projectId?: string }; error?: string };
        if (!response.ok || !payload.flow?.projectId) {
          throw new Error(payload.error ?? "Não foi possível criar o Projeto para este Flow.");
        }
        flowProjectIdRef.current = payload.flow.projectId;
        setFlowProjectId(payload.flow.projectId);
        return payload.flow.projectId;
      })().finally(() => {
        ensureProjectPromiseRef.current = null;
      });
    }

    return ensureProjectPromiseRef.current;
  }, [flowId, flowName, flowProjectId]);

  const handleImportBaseImage = useCallback(() => {
    setPendingProjectAction(null);
    setIsProjectAssetPickerOpen(false);
    assetFileInputRef.current?.click();
  }, []);

  const handleCreateProjectForFlow = useCallback(async () => {
    const name = flowProjectName.trim();
    if (!name) {
      setFlowProjectError("Informe um nome para o Projeto.");
      return;
    }

    setIsCreatingProjectForFlow(true);
    setFlowProjectError(null);

    try {
      const response = await fetch(`/api/flows/${flowId}/project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          objective: flowProjectObjective.trim(),
        }),
      });
      const payload = (await response.json()) as {
        project?: { id?: string };
        flow?: { projectId?: string };
        error?: string;
      };

      if (!response.ok || !payload.flow?.projectId) {
        throw new Error(payload.error ?? "Não foi possível criar o Projeto para este Flow.");
      }

      const projectId = payload.flow.projectId;
      const nextAction = pendingProjectAction;
      setFlowProjectId(projectId);
      setPendingProjectAction(null);
      setFlowProjectError(null);

      if (nextAction === "import-base-image") {
        window.setTimeout(() => assetFileInputRef.current?.click(), 0);
      } else if (nextAction === "project-assets") {
        setIsProjectAssetPickerOpen(true);
        await loadProjectAssets(projectId);
      }
    } catch (error) {
      setFlowProjectError(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o Projeto para este Flow.",
      );
    } finally {
      setIsCreatingProjectForFlow(false);
    }
  }, [flowId, flowProjectName, flowProjectObjective, loadProjectAssets, pendingProjectAction]);

  const handleBaseImageFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.currentTarget;
      const file = input.files?.[0];
      input.value = "";

      if (!file) {
        return;
      }

      setIsImportingAsset(true);
      setErrorMessage(null);

      try {
        const projectId = await ensureFlowProject();
        const formData = new FormData();
        formData.append("file", file);
        formData.append("role", "source");
        const response = await fetch(`/api/projects/${projectId}/assets`, {
          method: "POST",
          body: formData,
        });
        const payload = (await response.json()) as {
          asset?: CanvasProjectAsset;
          error?: string;
        };

        if (!response.ok || !payload.asset?.assetId) {
          throw new Error(payload.error ?? "Não foi possível importar a imagem-base.");
        }

        fillProjectAssetNode(payload.asset, projectId);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível importar a imagem-base.",
        );
      } finally {
        setIsImportingAsset(false);
      }
    },
    [ensureFlowProject, fillProjectAssetNode],
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setRunMessage(null);

    const graph: FlowGraph = {
      nodes,
      edges,
      viewport: getViewport(),
    };

    const response = await fetch(`/api/flows/${flowId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: flowName,
        graph,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setErrorMessage(payload.error ?? "Não foi possível salvar o fluxo.");
      setIsSaving(false);
      return;
    }

    const payload = (await response.json()) as FlowResponse;
    setFlowName(payload.flow.name);
    setIsDirty(false);
    setLastSavedAt(
      new Date(payload.flow.updatedAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
    void estimateCost(graph);
    setIsSaving(false);
  }, [edges, estimateCost, flowId, flowName, getViewport, nodes]);

  const enqueueFlowRun = useCallback(async (confirmationToken: string) => {
    setIsRunning(true);
    setErrorMessage(null);
    setRunMessage(null);

    const response = await fetch(`/api/flows/${flowId}/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ confirmationToken }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setErrorMessage(payload.error ?? "Não foi possível executar o fluxo.");
      setIsRunning(false);
      return;
    }

    const payload = (await response.json()) as FlowRunResponse;
    applyRunState(payload.flowRun);
    void pollRun(payload.flowRun.id);
    setRunMessage("execução enfileirada");
    setIsRunning(false);
  }, [applyRunState, flowId, pollRun]);

  const handleRun = useCallback(async () => {
    if (isDirty) {
      setErrorMessage("Salve o fluxo antes de executar.");
      return;
    }

    const graph: FlowGraph = {
      nodes,
      edges,
      viewport: getViewport(),
    };

    setErrorMessage(null);
    setRunMessage(null);
    setCostConfirm({
      open: true,
      isLoading: true,
      cost: null,
      errorMessage: null,
      confirmationToken: null,
    });

    const requestId = costConfirmRequestRef.current + 1;
    costConfirmRequestRef.current = requestId;

    try {
      const payload = await fetchFlowCost(graph);
      if (costConfirmRequestRef.current !== requestId) {
        return;
      }
      applyCostEstimate(payload);
      setCostConfirm({
        open: true,
        isLoading: false,
        cost: payload.cost,
        errorMessage: null,
        confirmationToken: payload.confirmation?.token ?? null,
      });
    } catch (error) {
      if (costConfirmRequestRef.current !== requestId) {
        return;
      }
      setCostConfirm({
        open: true,
        isLoading: false,
        cost: null,
        confirmationToken: null,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Não foi possível estimar o custo do fluxo.",
      });
    }
  }, [
    applyCostEstimate,
    edges,
    fetchFlowCost,
    getViewport,
    isDirty,
    nodes,
  ]);

  const handleCancelCostConfirm = useCallback(() => {
    if (isRunning) {
      return;
    }

    costConfirmRequestRef.current += 1;
    setCostConfirm({
      open: false,
      isLoading: false,
      cost: null,
      errorMessage: null,
      confirmationToken: null,
    });
  }, [isRunning]);

  const handleConfirmCost = useCallback(async () => {
    if (!costConfirm.cost || !costConfirm.confirmationToken || costConfirm.isLoading || costConfirm.errorMessage) {
      return;
    }

    await enqueueFlowRun(costConfirm.confirmationToken);
    setCostConfirm({
      open: false,
      isLoading: false,
      cost: null,
      errorMessage: null,
      confirmationToken: null,
    });
  }, [
    costConfirm.cost,
    costConfirm.errorMessage,
    costConfirm.isLoading,
    costConfirm.confirmationToken,
    enqueueFlowRun,
  ]);

  function handleBuildRecipe() {
    const source = createNode(assetInputDefinition, { x: 80, y: 140 }, flowProjectId);
    source.data.title = "Imagem-base do Projeto";
    const video = createNode(createActionDefinition(createActionSections[0].actions.find((action) => action.id === "video-generation")!), { x: 460, y: 140 }, flowProjectId);
    setNodes([source, video]);
    setEdges([{ id: `edge-${crypto.randomUUID()}`, source: source.id, sourceHandle: "image", target: video.id, targetHandle: "input", type: "smoothstep" }]);
    setIsDirty(true);
    window.requestAnimationFrame(() => void fitView({ padding: 0.22 }));
  }

  const isEmpty = !isLoading && !loadError && nodes.length === 0;
  const statusMessage = errorMessage
    ? errorMessage
    : runMessage
      ? runMessage
      : isDirty
        ? "alterações não salvas"
        : lastSavedAt
          ? `Salvo às ${lastSavedAt}`
          : "pronto";

  return (
    <main className="flex h-[calc(100vh-3.5rem)] min-h-0 flex-col overflow-hidden bg-lab-bg text-lab-text">
      <header className="shrink-0 border-b border-lab-border bg-lab-surface-1 px-3 py-2 md:flex md:h-12 md:items-center md:gap-3 md:px-4 md:py-0">
        <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
          <Link href={flowProjectId ? `/projetos/${flowProjectId}` : "/fluxos"} title={flowProjectId ? "Voltar ao Projeto" : "Voltar aos fluxos"} className="flex h-10 shrink-0 items-center gap-2 rounded-control px-2 text-sm text-lab-text transition-colors hover:bg-lab-surface-2 focus-visible:outline-none focus-visible:shadow-lab-focus md:h-[30px] md:max-w-60 md:border md:border-lab-border">
            <ArrowLeft className="size-4 shrink-0 text-lab-text-dim" />
            {flowProjectId ? <span className="hidden size-2 shrink-0 rounded-sm bg-[var(--lab-ctx-project)] md:block" /> : null}
            <span className="hidden truncate text-[13px] md:block">{flowProjectId ? projectDisplayName : "Fluxos"}</span>
          </Link>
          <span aria-hidden className="hidden text-lab-border-strong md:block">/</span>
          <div className="min-w-0 flex-1 md:max-w-56">
            {flowProjectId ? <span className="flex items-center gap-1.5 truncate text-xs text-lab-text-dim md:hidden"><span className="size-1.5 shrink-0 rounded-sm bg-[var(--lab-ctx-project)]" />{projectDisplayName}</span> : null}
            <input aria-label="Nome do fluxo" value={flowName} onChange={(event) => { setFlowName(event.target.value); setIsDirty(true); setRunMessage(null); }} className="lab-ghost-input h-8 w-full min-w-0 font-display text-sm font-medium" />
          </div>
          <div className="hidden min-w-0 items-center gap-1.5 text-xs lg:flex">
            {!isDirty && !errorMessage ? <Check className="size-3.5 shrink-0 text-lab-text-muted" /> : null}
            <span className={cn("truncate", errorMessage ? "text-lab-danger" : "text-lab-text-muted")}>{statusMessage}</span>
          </div>
          <span className="md:hidden">{renderTotalCost()}</span>
        </div>
        <p className="ml-2 mt-1 flex items-center gap-1.5 text-xs text-lab-text-dim md:hidden"><Monitor className="size-3.5" />Modo revisão · edite o grafo no computador</p>
        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <span className="mr-1 flex items-center gap-2 text-xs text-lab-text-dim">Total {renderTotalCost()}</span>
          <Button onClick={handleSave} disabled={isSaving || isLoading || !!loadError || !isDirty} size="sm" variant="secondary">{isSaving ? <Loader2 className="animate-spin" /> : <Save />}Salvar</Button>
          <Button onClick={handleRun} disabled={isRunning || isLoading || !!loadError} size="sm">{isRunning ? <Loader2 className="animate-spin" /> : <Play />}{isRunning ? "Executando…" : "Executar"}</Button>
        </div>
      </header>

      <section className="relative min-h-0 flex-1">
        <div className="absolute inset-0 hidden md:block">
        <ReactFlow
          nodes={nodesWithExtendDepth}
          edges={edges}
          nodeTypes={nodeTypes}
          colorMode="dark"
          onNodesChange={(changes) => {
            onNodesChange(changes);
            if (changes.some((change) => change.type !== "select" && change.type !== "dimensions")) {
              setIsDirty(true);
              setRunMessage(null);
            }
          }}
          onEdgesChange={(changes) => {
            onEdgesChange(changes);
            if (changes.some((change) => change.type !== "select")) {
              setIsDirty(true);
              setRunMessage(null);
            }
          }}
          onConnect={onConnect}
          onConnectEnd={(event) => {
            const point = "changedTouches" in event ? event.changedTouches[0] : event;
            setConnectionHintAt(point ? { x: point.clientX, y: point.clientY } : null);
          }}
          fitView
          fitViewOptions={{ padding: 0.18 }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={16}
            size={1}
            color="var(--lab-canvas-dot)"
          />
          <MiniMap
            pannable
            zoomable
            position="bottom-left"
            className="!bottom-20 !h-[104px] !w-40"
            nodeColor="var(--lab-surface-2)"
            nodeStrokeColor="var(--lab-border-strong)"
            maskColor="var(--lab-canvas-mask)"
          />
          <Controls position="bottom-right" showInteractive={false} />
        </ReactFlow>
        <div aria-hidden className="pointer-events-none absolute inset-0 grid grid-cols-7">
          {["BRIEFING", "DIREÇÃO", "PRODUÇÃO", "REVISÃO", "MONTAGEM", "PUBLICAÇÃO", "APRENDIZADO"].map((phase, index) => <div key={phase} className="border-r border-lab-text/[.035] px-3.5 py-3 font-mono text-eyebrow font-medium tracking-[.1em] text-lab-text-muted/65" style={{ background: index % 2 ? "rgba(233,236,242,.008)" : undefined }}>{phase}</div>)}
        </div>
        </div>
        <div className="absolute inset-0 overflow-y-auto p-4 md:hidden" aria-label="Revisão do fluxo">
          {nodes.map((node) => <div key={node.id} className="flex gap-3">
            <div className="flex w-3 shrink-0 flex-col items-center pt-[18px]"><span className={cn("size-2.5 rounded-full", node.data.status === "running" ? "bg-lab-reagent" : node.data.status === "failed" ? "bg-lab-danger" : "bg-lab-border-strong")} /><span className="w-0.5 flex-1 bg-lab-border" /></div>
            <div className={cn("mb-2.5 min-w-0 flex-1 overflow-hidden rounded-lab border bg-lab-surface-2", node.data.status === "failed" ? "border-lab-danger" : node.data.status === "running" ? "animate-lab-pulse border-lab-reagent" : "border-lab-border")}>
              <div className="h-0.5" style={{ background: node.data.kind.includes("video") ? "var(--lab-node-video)" : node.data.kind === "asset-input" ? "var(--lab-ctx-project)" : "var(--lab-node-image)" }} />
              <div className="flex items-center gap-2.5 px-3 py-2.5"><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{node.data.title}</div><div className="mt-0.5 text-xs text-lab-text-dim">{({ idle: "Pronto para configurar", ready: "Pronto para executar", running: "Gerando…", queued: "Na fila", done: "Concluído", failed: "Falha na execução" })[node.data.status]}</div></div><span className="shrink-0 font-mono text-eyebrow text-lab-text-dim">{typeof node.data.params?.actualCostBrl === "number" ? `${formatBrl(node.data.params.actualCostBrl)} ✓` : node.data.costLabel ?? "A calcular"}</span></div>
            </div>
          </div>)}
        </div>

        {connectionHint ? <InvalidEdgeHint message={connectionHint.message} suggestion={connectionHint.suggestion} at={connectionHintAt} /> : null}

        <div className="absolute bottom-5 left-5 z-20 hidden md:block">
          <Button
            type="button"
            onClick={() => setIsNodeMenuOpen((current) => !current)}
            aria-label="Criar"
            aria-expanded={isNodeMenuOpen}
            variant="secondary"
            className={cn("h-10 rounded-full px-3.5", isNodeMenuOpen && "border-lab-reagent shadow-lab-focus")}
          >
            {isNodeMenuOpen ? <X /> : <Plus />}
            {isNodeMenuOpen ? "Fechar" : "Criar"}
          </Button>

          {isNodeMenuOpen ? (
            <div
              data-testid="create-menu"
              data-menu-scroll="true"
              className="absolute bottom-14 flex max-h-[calc(100dvh-12rem)] w-[min(340px,calc(100vw-2.5rem))] flex-col overflow-y-auto overscroll-contain rounded-lab border border-lab-border-strong bg-lab-surface-1 p-2 shadow-lab-popover"
            >
              <CreateNodeMenu
                search={createSearch}
                onSearch={setCreateSearch}
                priorityActions={priorityCreateActions}
                sections={visibleCreateSections}
                compatibilityActions={visibleCompatibilityActions}
                isImporting={isImportingAsset}
                onPriority={(action) => {
                  if (action.id === "import-base-image") handleImportBaseImage();
                  else void openProjectAssetPicker();
                }}
                onAdd={(action) => handleAddNode(createActionDefinition(action))}
              >
              {pendingProjectAction ? (
                <div
                  data-testid="flow-project-link-panel"
                  className="mt-3 border-t border-lab-border px-2 pt-3"
                >
                  <p className="text-xs leading-5 text-lab-text-dim">
                    Este Flow ainda não está vinculado a um Projeto. Crie a casa deste trabalho para continuar.
                  </p>
                  <label className="mt-3 grid gap-1 text-xs text-lab-text" htmlFor="flow-project-name">
                    Nome do Projeto
                    <input
                      id="flow-project-name"
                      name="flow-project-name"
                      value={flowProjectName}
                      onChange={(event) => setFlowProjectName(event.target.value)}
                      required
                      className="lab-ghost-input"
                    />
                  </label>
                  <label className="mt-2 grid gap-1 text-xs text-lab-text" htmlFor="flow-project-objective">
                    Objetivo do Projeto <span className="text-lab-text-muted">opcional</span>
                    <textarea
                      id="flow-project-objective"
                      name="flow-project-objective"
                      value={flowProjectObjective}
                      onChange={(event) => setFlowProjectObjective(event.target.value)}
                      rows={2}
                      className="lab-ghost-input min-h-14 resize-y"
                    />
                  </label>
                  <Button
                    type="button"
                    data-action="create-project-for-flow"
                    onClick={() => void handleCreateProjectForFlow()}
                    disabled={isCreatingProjectForFlow}
                    className="mt-3 w-full"
                  >
                    {isCreatingProjectForFlow ? "Criando Projeto..." : "Criar Projeto para este Flow"}
                  </Button>
                  {flowProjectError ? (
                    <p role="alert" className="mt-2 text-xs text-lab-danger">
                      {flowProjectError}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {isProjectAssetPickerOpen ? (
                <div
                  data-testid="project-asset-picker"
                  className="mt-3 border-t border-lab-border px-2 pt-3"
                >
                  <div className="mb-2 text-xs font-medium text-lab-text">
                    Escolha um Asset de imagem ou vídeo
                  </div>
                  {projectAssetsError ? (
                    <p role="alert" className="text-xs text-lab-danger">
                      {projectAssetsError}
                    </p>
                  ) : projectAssets.length > 0 ? (
                    <div className="grid gap-1.5">
                      {projectAssets.map((asset) => (
                        <button
                          key={asset.assetId}
                          type="button"
                          data-asset-option={asset.assetId}
                          onClick={() => {
                            if (flowProjectId) fillProjectAssetNode(asset, flowProjectId);
                          }}
                          className="rounded-control border border-lab-border bg-lab-surface-2 px-3 py-2 text-left text-xs text-lab-text transition-colors hover:border-lab-border-strong focus-visible:outline-none focus-visible:shadow-lab-focus"
                        >
                          <span className="flex items-center gap-2.5">
                            {asset.url && asset.type !== "VIDEO" ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={asset.url} alt="" className="size-9 shrink-0 rounded-control border border-lab-border object-cover" />
                            ) : null}
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{asset.metadata?.originalFileName ?? (asset.type === "VIDEO" ? "Vídeo sem nome" : "Imagem sem nome")}</span>
                              <span className="block text-lab-text-muted">
                                {asset.type === "VIDEO" ? "Vídeo" : "Imagem"} · fonte do Projeto
                              </span>
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-lab-text-muted">
                      Nenhum Asset de imagem ou vídeo disponível neste Projeto.
                    </p>
                  )}
                </div>
              ) : null}
              </CreateNodeMenu>
            </div>
          ) : null}

          <input
            ref={assetFileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            aria-label="Arquivo da imagem-base"
            className="sr-only"
            onChange={(event) => void handleBaseImageFileChange(event)}
          />
        </div>

        {isEmpty ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="pointer-events-auto mx-5 flex w-full max-w-[420px] flex-col gap-3 rounded-lab border border-dashed border-lab-border-strong bg-lab-surface-1 p-[22px]">
              <div className="font-display text-base font-semibold">
                Bancada vazia
              </div>
              <p className="text-sm text-lab-text-dim">
                Monte a receita mais usada: Imagem-base do Projeto → Animar imagem. Nada roda até você confirmar o custo.
              </p>
              <div className="hidden flex-wrap items-center gap-3 md:flex"><Button onClick={handleBuildRecipe} size="sm">Montar receita</Button><CostChip state="pending" size="sm" /><button type="button" onClick={() => setIsNodeMenuOpen(true)} className="text-[13px] text-lab-text-dim hover:text-lab-text">ou Criar nó</button></div><p className="text-xs text-lab-text-muted md:hidden">Abra no computador para montar a receita.</p>
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <div role="status" className="absolute inset-0 grid place-items-center bg-lab-bg/70">
            <div className="flex flex-col items-center gap-3"><span className="h-[3px] w-40 overflow-hidden rounded-full bg-lab-surface-2"><span className="block h-full animate-lab-shimmer bg-[linear-gradient(90deg,transparent,var(--lab-reagent),transparent)] bg-[length:200%_100%]" /></span><span className="font-mono text-xs font-medium tracking-wide text-lab-text-dim">Preparando o laboratório…</span></div>
          </div>
        ) : null}
        {loadError ? <div className="absolute inset-0 grid place-items-center bg-lab-bg p-5"><div className="flex w-full max-w-[440px] items-start gap-3.5 rounded-lab border border-lab-danger-line bg-lab-surface-1 p-5"><AlertTriangle className="size-5 shrink-0 text-lab-danger" /><div><h2 className="font-display text-base font-medium">Não foi possível abrir este fluxo</h2><p className="mt-1.5 text-[13px] leading-[18px] text-lab-text-dim">Ele pode ter sido removido ou o banco não respondeu.</p><div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" size="sm" onClick={() => void loadFlow().catch((error: Error) => { setLoadError(error.message); setIsLoading(false); })}><RotateCcw />Tentar de novo</Button><Button variant="ghost" size="sm" asChild><Link href={flowProjectId ? `/projetos/${flowProjectId}` : "/fluxos"}>{flowProjectId ? "Voltar ao Projeto" : "Voltar aos fluxos"}</Link></Button></div><details className="mt-3 text-xs text-lab-text-muted"><summary>Detalhes técnicos</summary><p className="mt-2 break-words">{loadError}</p></details></div></div></div> : null}

      </section>

      <div className="flex shrink-0 gap-2 border-t border-lab-border bg-lab-surface-1 px-4 pb-5 pt-3 md:hidden">
        <Button variant="secondary" size="icon" aria-label="Salvar fluxo" onClick={handleSave} disabled={!isDirty || isSaving || isLoading || !!loadError} className="size-12"><Save /></Button>
        <Button onClick={handleRun} disabled={isLoading || isRunning || !!loadError} className="h-12 flex-1"><Play />Executar · confirma custo</Button>
      </div>

      <CostConfirmModal
        open={costConfirm.open}
        totalBrl={costConfirm.cost?.total.brl ?? null}
        items={costConfirmItems}
        isLoading={costConfirm.isLoading}
        isConfirming={isRunning}
        errorMessage={costConfirm.errorMessage}
        formatBrl={formatBrl}
        onCancel={handleCancelCostConfirm}
        onConfirm={handleConfirmCost}
        onRetry={() => void handleRun()}
      />
    </main>
  );

  function renderTotalCost() {
    if (costLabel === "A calcular") return <CostChip state="pending" />;
    if (costLabel === "indisponível") return <CostChip state="unavailable" />;
    return <span className="inline-flex h-[26px] items-center rounded-full border border-lab-reagent-line bg-lab-reagent-dim px-2 font-mono text-xs font-medium text-lab-reagent-bright">{costLabel}</span>;
  }
}

export function FlowCanvas({ flowId }: { flowId: string }) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner flowId={flowId} />
    </ReactFlowProvider>
  );
}
