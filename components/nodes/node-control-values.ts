export function nodeStatusLabel(status: string) {
  return ({ queued: "Na fila", running: "Gerando…", failed: "Falha na geração", ready: "Pronto para executar", done: "Concluído" } as Record<string, string>)[status] ?? "Aguardando resultado";
}

export function getString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function getBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}
