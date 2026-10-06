"use client";

import { useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { buttonVariants } from "@/components/ui/button";
import { useMobile } from "@/lib/use-mobile";
import { costText } from "@/lib/plan";
import { stepStatus } from "@/components/ui/badge";

type StepData = {
  title: string;
  status: keyof typeof stepStatus;
  kind: string;
  assets: number;
  thumb: string | null;
  video: string | null;
  actualCost: number | null;
  estimatedCost: number | null;
  inputType: string;
  outputType: string;
  [key: string]: unknown;
};
type StepNode = Node<StepData, "productionStep">;
const colors: Record<string, string> = {
  SCRIPT: "var(--lab-node-copy)",
  IMAGE: "var(--lab-node-image)",
  VIDEO: "var(--lab-node-video)",
  ASSEMBLY: "var(--lab-node-publish)",
};
function ProductionNode({ id, data, selected }: NodeProps<StepNode>) {
  return (
    <div
      className={`w-64 rounded-lab border bg-lab-surface-1 p-4 ${selected ? "border-lab-reagent" : "border-lab-border-strong"}`}
    >
      {data.kind !== "SCRIPT" ? (
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={false}
          style={{ background: colors[data.kind] }}
        />
      ) : null}
      <div className="flex items-center gap-2">
        <span
          className="size-2 rounded-full"
          style={{ background: colors[data.kind] }}
        />
        <h2 className="font-display text-body-sm font-medium">{data.title}</h2>
      </div>
      <p className="mt-2 text-caption text-lab-text-dim">
        {stepStatus[data.status][1]}
      </p>
      {data.video ? (
        <video src={data.video} muted loop playsInline preload="metadata" className="nodrag mt-3 aspect-[9/16] max-h-40 w-full rounded-control bg-lab-bg object-cover" onMouseEnter={(event) => void event.currentTarget.play().catch(() => {})} onMouseLeave={(event) => event.currentTarget.pause()} />
      ) : data.thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.thumb} alt="" className="mt-3 aspect-[9/16] max-h-40 w-full rounded-control object-cover" />
      ) : (
        <div className="lab-placeholder-media mt-3 flex h-20 items-center justify-center rounded-control text-caption text-lab-text-muted">{data.status === "RUNNING" ? "Gerando…" : "Sem arquivo ainda"}</div>
      )}
      <p className="mt-2 font-mono text-caption text-lab-text-dim">
        {data.actualCost !== null
          ? `${costText(data.actualCost)} ✓`
          : data.estimatedCost !== null
            ? `~${costText(data.estimatedCost)}`
            : "Custo a apurar"}
      </p>
      <div className="my-3 flex justify-between text-[10px] text-lab-text-muted">
        <span>{data.inputType}</span>
        <span>{data.outputType}</span>
      </div>
      <a
        href={`#step-${id}`}
        className={buttonVariants({
          variant: "secondary",
          size: "sm",
          className: "nodrag nowheel w-full",
        })}
      >
        Abrir etapa
      </a>
      {data.kind !== "ASSEMBLY" ? (
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={false}
          style={{ background: colors[data.kind] }}
        />
      ) : null}
    </div>
  );
}
const nodeTypes = { productionStep: ProductionNode };
export function FlowCanvas({
  contentId,
  steps,
}: {
  contentId: string;
  steps: {
    id: string;
    kind: string;
    title: string;
    status: keyof typeof stepStatus;
    assets: number;
    thumb: string | null;
    video: string | null;
    actualCost: number | null;
    estimatedCost: number | null;
  }[];
}) {
  const mobile = useMobile();
  const initial: StepNode[] = steps.map((step, index) => ({
    id: step.id,
    type: "productionStep",
    position: { x: mobile ? 0 : index * 330, y: mobile ? index * 280 : 70 },
    data: {
      ...step,
      inputType:
        step.kind === "SCRIPT"
          ? "Ideia"
          : step.kind === "IMAGE"
            ? "Texto + rosto"
            : step.kind === "VIDEO"
              ? "Imagem"
              : "Clipes",
      outputType:
        step.kind === "SCRIPT"
          ? "Texto"
          : step.kind === "IMAGE"
            ? "Imagem"
            : "Vídeo",
    },
  }));
  const [nodes, setNodes, onNodesChange] = useNodesState(initial);
  const [storageMessage, setStorageMessage] = useState("");
  const key = `labia-canvas:${contentId}:${mobile ? "mobile" : "desktop"}`;
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? "{}");
      setNodes((current) =>
        current.map((node, index) =>
          Number.isFinite(saved?.[node.id]?.x) &&
          Number.isFinite(saved?.[node.id]?.y)
            ? { ...node, position: saved[node.id] }
            : {
                ...node,
                position: {
                  x: mobile ? 0 : index * 330,
                  y: mobile ? index * 280 : 70,
                },
              },
        ),
      );
    } catch {
      /* A malformed or unavailable local preference must not block production. */
    }
  }, [key, mobile, setNodes]);
  useEffect(() => {
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        data: { ...node.data, ...steps.find((step) => step.id === node.id) },
      })),
    );
  }, [steps, setNodes]);
  const edges = steps
    .slice(1)
    .map((step, index) => ({
      id: `${steps[index].id}-${step.id}`,
      source: steps[index].id,
      target: step.id,
      type: "smoothstep",
      animated: step.status === "RUNNING",
      style: { stroke: "var(--lab-border-strong)", strokeWidth: 2 },
    }));
  return (
    <section
      aria-label="Canvas da produção"
      className="overflow-hidden rounded-lab border border-lab-border"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-lab-border bg-lab-surface-1 p-4">
        <div>
          <h2 className="font-display text-lg">Fluxo da produção</h2>
          <p className="mt-1 text-caption text-lab-text-dim">
            Arraste os cartões e abra uma etapa para configurar ou executar. As
            conexões seguem a receita desta produção.
          </p>
        </div>
        <button
          className={buttonVariants({ variant: "secondary", size: "sm" })}
          onClick={() => {
            setNodes(initial);
            try {
              localStorage.removeItem(key);
              setStorageMessage("Posições restauradas.");
            } catch {
              setStorageMessage("Posições restauradas nesta visualização.");
            }
          }}
        >
          Organizar cartões
        </button>
      </div>
      <div className="h-[420px] bg-lab-bg md:h-[520px]">
        <ReactFlow
          key={mobile ? "mobile" : "desktop"}
          defaultViewport={{ x: 32, y: 32, zoom: 1 }}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          nodesConnectable={false}
          edgesReconnectable={false}
          deleteKeyCode={null}
          fitView={!mobile}
          minZoom={0.25}
          maxZoom={1.5}
          colorMode="dark"
          onNodeDragStop={(_event, _node, current) => {
            try {
              localStorage.setItem(
                key,
                JSON.stringify(
                  Object.fromEntries(
                    current.map((node) => [node.id, node.position]),
                  ),
                ),
              );
              setStorageMessage("Posições salvas neste navegador.");
            } catch {
              setStorageMessage(
                "Não foi possível salvar as posições neste navegador.",
              );
            }
          }}
        >
          <Background color="var(--lab-canvas-dot)" gap={20} />
          <Controls showInteractive={false} />
          <MiniMap
            className="hidden md:block"
            pannable
            zoomable
            nodeColor={(node) =>
              colors[String(node.data.kind)] ?? "var(--lab-text-muted)"
            }
          />
        </ReactFlow>
      </div>
      <p
        role="status"
        className="bg-lab-surface-1 px-4 py-2 text-caption text-lab-text-muted"
      >
        {storageMessage ||
          "Zoom, visão geral e posições dos cartões disponíveis. As etapas são as mesmas da lista abaixo."}
      </p>
    </section>
  );
}
