import { randomBytes } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { Pool } from "pg";
import { hashPassword } from "../src/lib/password";

// Raw SQL, not the Prisma client: Prisma 7's generated client is ESM-only and Playwright loads specs
// as CommonJS. Setup is also deliberately independent of the app code under test. Plain pg works
// against Neon and against the CI job's local Postgres alike.
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2, allowExitOnIdle: true });
export async function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  const text = strings.reduce((query, part, i) => query + part + (i < values.length ? `$${i + 1}` : ""), "");
  return (await pool.query(text, values)).rows;
}

// Every spec seeds its own accounts under one prefix and deletes them in afterAll. Never a real one.
export const runPrefix = () => `e2e-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;

// Seeded accounts have confirmed their e-mail and accepted the current Terms unless told otherwise,
// so specs about something else never stop at those gates.
export async function seedUser(email: string, options: { password?: string; role?: "USER" | "OWNER"; verified?: boolean; consent?: boolean } = {}) {
  const id = `e2e${randomBytes(10).toString("hex")}`;
  const hash = options.password ? await hashPassword(options.password) : null;
  const verifiedAt = options.verified === false ? null : new Date();
  const consentAt = options.consent === false ? null : new Date();
  await sql`INSERT INTO users (id, email, role, password_hash, email_verified_at, consent_accepted_at, consent_terms_version) VALUES (${id}, ${email}, ${options.role ?? "USER"}::"UserRole", ${hash}, ${verifiedAt}, ${consentAt}, ${consentAt ? "e2e" : null})`;
  return id;
}

export async function deleteUsers(prefix: string) {
  await sql`DELETE FROM admin_actions WHERE target_user_id IN (SELECT id FROM users WHERE email LIKE ${prefix + "%"})`;
  await sql`DELETE FROM users WHERE email LIKE ${prefix + "%"}`;
}

// The dev provider (development only) stands in for Google, the only method owner powers accept.
export async function signInDev(page: Page, email: string) {
  await page.goto("/login");
  const form = page.locator("form").filter({ hasText: "Só em desenvolvimento" });
  await form.getByRole("textbox").fill(email);
  await form.getByRole("button").click();
  // The URL passes through /painel before the layout sends a new account on to /consentimento,
  // so wait for what actually rendered, not for the address.
  await page.locator("#app-content, h1:has-text('Antes de começar')").first().waitFor();
  if (await page.getByRole("heading", { name: "Antes de começar" }).count()) await acceptConsent(page);
}

// What a Google-created account sees once: no sign-up form ever asked it.
export async function acceptConsent(page: Page) {
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\/painel/);
  // Wait for the panel to render: navigating away while the action's redirect is still landing
  // gets overridden by it.
  await page.locator("#app-content").waitFor();
}

export async function signInPassword(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder("voce@exemplo.com").first().fill(email);
  await page.getByPlaceholder("Sua senha").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel/);
}

// In development, src/lib/email.ts writes messages to .handoff/outbox.jsonl instead of sending them.
export async function lastEmail(to: string): Promise<{ subject: string; text: string }> {
  const { readFile } = await import("node:fs/promises");
  for (let attempt = 0; attempt < 20; attempt++) {
    const lines = (await readFile(".handoff/outbox.jsonl", "utf8").catch(() => "")).trim().split("\n").filter(Boolean);
    const found = lines.map((line) => JSON.parse(line)).filter((m) => m.to === to).at(-1);
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No e-mail to ${to}`);
}
export const linkIn = (text: string) => text.match(/https?:\/\/\S+/)![0].replace(/^https?:\/\/[^/]+/, "");
export const codeIn = (text: string) => text.match(/Código: (\d{6})/)![1];

// Rate limits are real and every run comes from the same local address ("unknown" without a proxy
// header). Clears only that address's counters and the e2e accounts', never anyone else's.
export async function resetLocalRateLimits() {
  await sql`DELETE FROM rate_limit_events WHERE key LIKE '%:unknown' OR key LIKE '%:127.0.0.1' OR key LIKE '%:::1' OR key LIKE '%e2e-%'`;
}
