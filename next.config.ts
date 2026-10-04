import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // A stray package-lock.json in the home directory otherwise confuses root detection.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
