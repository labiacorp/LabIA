import { config } from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import { VIDEO_DEFINITIONS } from "../src/lib/providers/video-models.ts";

config({ path: ".env.local", quiet: true });
if (!process.env.FAL_KEY) {
  console.error("FAL_KEY is missing. No request was made; configure it locally to check price metadata.");
  process.exit(1);
}
const endpoint = "https://api.fal.ai/v1/models/pricing";
const prices = [];
for (let offset = 0; offset < VIDEO_DEFINITIONS.length; offset += 50) {
  const url = new URL(endpoint);
  for (const model of VIDEO_DEFINITIONS.slice(offset, offset + 50)) url.searchParams.append("endpoint_id", model.id);
  const response = await fetch(url, { headers: { Authorization: `Key ${process.env.FAL_KEY}` }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Price metadata request failed: HTTP ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data.prices)) throw new Error("Unexpected price metadata response.");
  prices.push(...data.prices);
}
await mkdir(".handoff", { recursive: true });
await writeFile(".handoff/fal-price-check.json", JSON.stringify({ fetchedAt: new Date().toISOString(), source: endpoint, requestedEndpointIds: VIDEO_DEFINITIONS.map((model) => model.id), prices }, null, 2) + "\n");
console.log(`Saved ${prices.length} price records to .handoff/fal-price-check.json. No generation was submitted and no catalog rate was changed.`);
console.log("Review billing units, resolution/audio variants and token formulas before updating VIDEO_DEFINITIONS and its verification date.");
