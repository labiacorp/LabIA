export const DEFAULT_AFTER_LOGIN_PATH = "/fluxos";

// Só aceita caminho interno: "/x" sim; "//site", "/\site" e URL absoluta não (redirecionamento aberto).
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/")) return DEFAULT_AFTER_LOGIN_PATH;
  if (value.startsWith("//") || value.startsWith("/\\")) return DEFAULT_AFTER_LOGIN_PATH;
  return value;
}
