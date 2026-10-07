import { config } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

config({ path: ".env.local" });

// Port 3100, not 3000: a `next dev` someone already has open on 3000 must never be the one a run
// drives. The run starts its own dev server (or reuses one already on 3100) with FAL_MOCK=1, so no
// spec can reach a paid provider. AUTH_URL is this origin, not .env.local's 127.0.0.1:3000, so the mock
// OAuth callback (src/app/api/integrations/origin.ts) lands on the host that holds the session cookie.
// ALLOWED_EMAILS is emptied for the same reason as FAL_MOCK: a local .env.local restriction must not lock the seeded accounts out. SOCIAL_TOKEN_KEY is emptied too, so the e2e proves the keyless mock path. Specs seed their own accounts (tests/helpers.ts) and delete them.
const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100);

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  // `next dev` compiles each route on its first hit, which can outlast the default 5s on a cold start
  // (right after `npm run build`, as in CI). Assertions wait for the page, not for the compiler.
  expect: { timeout: 20_000 },
  workers: 1,
  reporter: "list",
  use: { baseURL: `http://localhost:${port}`, locale: "pt-BR", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true } },
  ],
  webServer: { command: `npx next dev -p ${port}`, port, reuseExistingServer: true, timeout: 120_000, env: { FAL_MOCK: "1", AUTH_URL: `http://localhost:${port}`, ALLOWED_EMAILS: "", SOCIAL_TOKEN_KEY: "" } },
});
