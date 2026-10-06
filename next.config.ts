import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Local sign-in redirects to AUTH_URL (127.0.0.1); without this Next 16 blocks the dev scripts there and nothing hydrates.
  allowedDevOrigins: ["127.0.0.1"],
  // A stray package-lock.json in the home directory otherwise confuses root detection.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  // Visitors without a session see the landing at "/"; signed-in users keep the studio.
  async rewrites() {
    const missing = ["authjs.session-token", "__Secure-authjs.session-token"].map((key) => ({ type: "cookie" as const, key }));
    return { beforeFiles: [{ source: "/", missing, destination: "/lp" }] };
  },
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
