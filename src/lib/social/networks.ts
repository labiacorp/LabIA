// Import-free: client components import this module.
export type NetworkId = "X" | "INSTAGRAM" | "TIKTOK" | "LINKEDIN" | "THREADS" | "YOUTUBE" | "FACEBOOK" | "BLUESKY";

export type NetworkInfo = {
  id: NetworkId;
  label: string;
  backend: "x" | "bundle" | null;
  audience: "all" | "owners" | "soon";
  maxText: number;
  media: ("IMAGE" | "VIDEO")[];
  note?: string;
};

export const NETWORKS: NetworkInfo[] = [
  { id: "X", label: "X", backend: "x", audience: "all", maxText: 280, media: ["IMAGE", "VIDEO"] },
  { id: "INSTAGRAM", label: "Instagram", backend: "bundle", audience: "soon", maxText: 2200, media: ["IMAGE", "VIDEO"] },
  { id: "TIKTOK", label: "TikTok", backend: "bundle", audience: "soon", maxText: 2200, media: ["VIDEO"] },
  {
    id: "LINKEDIN",
    label: "LinkedIn",
    backend: "bundle",
    audience: "soon",
    maxText: 3000,
    media: ["IMAGE", "VIDEO"],
    note: "Somente páginas de empresa",
  },
  { id: "THREADS", label: "Threads", backend: "bundle", audience: "soon", maxText: 500, media: ["IMAGE", "VIDEO"] },
  { id: "YOUTUBE", label: "YouTube", backend: "bundle", audience: "soon", maxText: 5000, media: ["VIDEO"] },
  { id: "FACEBOOK", label: "Facebook", backend: "bundle", audience: "soon", maxText: 5000, media: ["IMAGE", "VIDEO"] },
  { id: "BLUESKY", label: "Bluesky", backend: null, audience: "soon", maxText: 300, media: ["IMAGE", "VIDEO"] },
];

export function networkVisible(network: NetworkInfo, isOwner: boolean): "active" | "soon" {
  if (network.audience === "all") return "active";
  if (network.audience === "owners" && isOwner) return "active";
  return "soon";
}

// X counts every code point outside the Basic Multilingual Plane as 2; other networks count code points.
export function textLength(network: NetworkId, text: string): number {
  let length = 0;
  for (const ch of text) length += network === "X" && ch.codePointAt(0)! > 0xffff ? 2 : 1;
  return length;
}
