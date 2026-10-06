// Warm the live USD→BRL quote when a server instance boots, so the first price shown already follows the market.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") (await import("@/lib/fx")).refreshRate();
}
