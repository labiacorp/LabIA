import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LabIA", short_name: "LabIA", description: "Conteúdo para influencers de IA, etapa por etapa.",
    start_url: "/", display: "standalone", background_color: "#0B0B0C", theme_color: "#0B0B0C", lang: "pt-BR",
    icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
