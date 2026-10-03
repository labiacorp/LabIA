import { Ban } from "lucide-react";

export type InvalidEdgeHintProps = {
  message: string;
  suggestion?: string | null;
  /** Posição (px, viewport) onde a aresta foi solta. Sem ela, centraliza no topo. */
  at?: { x: number; y: number } | null;
};

/** Aviso curto junto da aresta recusada: o que aconteceu e qual é o caminho certo. */
export function InvalidEdgeHint({ message, suggestion, at }: InvalidEdgeHintProps) {
  const style = at
    ? { left: Math.min(Math.max(at.x + 12, 12), (typeof window === "undefined" ? 1200 : window.innerWidth) - 272), top: Math.max(at.y - 24, 64) }
    : undefined;
  return (
    <div
      role="alert"
      data-id="invalid-edge-hint"
      style={style}
      className={`pointer-events-none fixed z-menu flex w-64 flex-col gap-1.5 rounded-control bg-lab-surface-1 px-3 py-2.5 shadow-lab-danger ${at ? "" : "left-1/2 top-16 -translate-x-1/2"}`}
    >
      <span className="flex items-center gap-1.5 text-caption font-semibold text-lab-danger"><Ban className="size-3.5" aria-hidden />Conexão não permitida</span>
      <span className="text-caption text-lab-text">{message}</span>
      {suggestion ? <span className="text-caption text-lab-text-dim">Passe por <b className="font-medium text-lab-text">{suggestion}</b> primeiro.</span> : null}
    </div>
  );
}
