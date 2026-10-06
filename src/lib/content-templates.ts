export type DraftStarter = {
  id: string;
  name: string;
  title: string;
  idea: string;
  script: string;
  aspectRatio: string;
};
// Original editorial starters. They prepare free drafts, not generated media or provider presets.
export const CONTENT_STARTERS: DraftStarter[] = [
  {
    id: "product-demo",
    name: "Demonstração de produto",
    title: "Um produto, uma solução",
    idea: "Mostre um problema cotidiano, demonstre um uso concreto do produto e termine com um convite simples. Substitua os campos entre colchetes por fatos verificáveis.",
    script:
      "0–5s: Você também passa por [problema]?\n5–10s: Veja como uso [produto] para [demonstração].\n10–15s: [Benefício observado]. Confira os detalhes antes de escolher.",
    aspectRatio: "9:16",
  },
  {
    id: "three-tips",
    name: "Três dicas rápidas",
    title: "Três dicas para começar",
    idea: "Uma dica por bloco de cinco segundos. Use exemplos visuais simples e mantenha o mesmo personagem e cenário.",
    script:
      "0–5s: Primeira dica: [ação simples].\n5–10s: Segunda: [erro a evitar].\n10–15s: Terceira: [próximo passo]. Salve para consultar depois.",
    aspectRatio: "9:16",
  },
  {
    id: "story",
    name: "Uma história curta",
    title: "O que mudou minha forma de pensar",
    idea: "Apresente uma situação, uma descoberta e a conclusão. Deixe claro quando a história é uma cena fictícia.",
    script:
      "0–5s: Imagine [situação].\n5–10s: Até que [descoberta ou mudança].\n10–15s: A ideia que fica é [conclusão].",
    aspectRatio: "9:16",
  },
  {
    id: "faq",
    name: "Responda uma dúvida",
    title: "A dúvida que sempre aparece",
    idea: "Escolha uma pergunta do público. Dê uma resposta objetiva, um exemplo e um próximo passo.",
    script:
      "0–5s: [Pergunta frequente]?\n5–10s: A resposta é [explicação com exemplo].\n10–15s: Comece por [próximo passo]. Qual é sua próxima dúvida?",
    aspectRatio: "9:16",
  },
  {
    id: "comparison",
    name: "Compare duas opções",
    title: "Qual opção faz sentido para você?",
    idea: "Compare duas opções pelo mesmo critério. Apresente limites e use apenas características verificadas.",
    script:
      "0–5s: Entre [A] e [B], o que muda?\n5–10s: Para [critério], [diferença verificável].\n10–15s: Se você precisa de [uso], considere [opção].",
    aspectRatio: "1:1",
  },
];
export function scriptText(input: unknown): string {
  if (!input || typeof input !== "object" || !("script" in input)) return "";
  return typeof input.script === "string" ? input.script.slice(0, 2000) : "";
}
