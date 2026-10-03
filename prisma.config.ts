import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local" });
config(); // fallback to .env (CI / Vercel provide real env vars)

// Migrations use the direct (unpooled) URL; the app itself uses DATABASE_URL (pooled).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"] },
});
