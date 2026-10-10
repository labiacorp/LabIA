import { config } from "dotenv";
import path from "node:path";
import { defineConfig } from "vitest/config";

config({ path: ".env.local" });
const localDatabase = ["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL ?? "http://unset").hostname);

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  // The local embedded database shares wire-protocol session state. Concurrency
  // within a test remains enabled; hosted database suites still run files in parallel.
  test: { include: ["src/**/*.test.ts"], passWithNoTests: true, testTimeout: 60_000, fileParallelism: !localDatabase },
});
