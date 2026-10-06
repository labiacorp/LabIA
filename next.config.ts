import type { NextConfig } from "next";
import path from "node:path";

const dev = process.env.NODE_ENV !== "production";
// CSP: the browser refuses anything not listed, so an injected script cannot run or phone home. Not nonce-based
// ('unsafe-inline' for scripts/styles) because Next inlines its bootstrap; the other directives still close the
// big holes (framing, <base>, plugins, form posts to strangers, connections to unknown hosts).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} https://us-assets.i.posthog.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https://us.i.posthog.com https://us-assets.i.posthog.com${dev ? " ws: wss:" : ""}`,
  "worker-src 'self' blob:",
  "form-action 'self' https://accounts.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "Content-Security-Policy", value: csp },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ] }];
  },
  // Local sign-in redirects to AUTH_URL (127.0.0.1); without this Next 16 blocks the dev scripts there and nothing hydrates.
  allowedDevOrigins: ["127.0.0.1"],
  // A stray package-lock.json in the home directory otherwise confuses root detection.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
