import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Local sign-in redirects to AUTH_URL (127.0.0.1); without this Next 16 blocks the dev scripts there and nothing hydrates.
  allowedDevOrigins: ["127.0.0.1"],
  // A stray package-lock.json in the home directory otherwise confuses root detection.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
