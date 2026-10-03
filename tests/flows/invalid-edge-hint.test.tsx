import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getCanvasConnectionHint } from "@/app/(studio)/fluxos/flow-canvas";
import { InvalidEdgeHint } from "@/components/flows/invalid-edge-hint";

const node = (id: string, kind: string, title: string) => ({
  id, type: "labNode", position: { x: 0, y: 0 }, data: { kind, title, description: "", status: "idle" },
}) as never;

describe("aviso de conexão inválida", () => {
  it("explica o motivo em PT-BR e aponta o caminho certo", () => {
    const hint = getCanvasConnectionHint(
      { nodes: [node("a", "asset-input", "Imagem-base"), node("m", "video-assembly", "Juntar clipes")], edges: [] },
      { source: "a", sourceHandle: "image", target: "m", targetHandle: "input" },
    );
    expect(hint).toEqual({ message: "Juntar clipes recebe vídeos, e isto é uma imagem.", suggestion: "Animar imagem" });
  });

  it("não avisa quando as portas combinam", () => {
    expect(getCanvasConnectionHint(
      { nodes: [node("p", "prompt", "Prompt"), node("i", "image-generation", "Gerar imagem")], edges: [] },
      { source: "p", sourceHandle: null, target: "i", targetHandle: null },
    )).toBeNull();
  });

  it("renderiza título, motivo e sugestão sem termos técnicos", () => {
    const html = renderToStaticMarkup(<InvalidEdgeHint message="Juntar clipes recebe vídeos, e isto é uma imagem." suggestion="Animar imagem" />);
    expect(html).toContain("Conexão não permitida");
    expect(html).toContain("Animar imagem");
    expect(html).toContain('role="alert"');
  });
});
