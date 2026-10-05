import { randomBytes } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { neon } from "@neondatabase/serverless";
import { hashPassword } from "../src/lib/password";

// Raw SQL, not the Prisma client: Prisma 7's generated client is ESM-only and Playwright loads specs
// as CommonJS. Setup is also deliberately independent of the app code under test.
export const sql = neon(process.env.DATABASE_URL!);

// Every spec seeds its own accounts under one prefix and deletes them in afterAll. Never a real one.
export const runPrefix = () => `e2e-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;

export async function seedUser(email: string, options: { password?: string; role?: "USER" | "OWNER"; verified?: boolean } = {}) {
  const id = `e2e${randomBytes(10).toString("hex")}`;
  const hash = options.password ? await hashPassword(options.password) : null;
  await sql`INSERT INTO users (id, email, role, password_hash) VALUES (${id}, ${email}, ${options.role ?? "USER"}::"UserRole", ${hash})`;
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
  await expect(page).toHaveURL(/\/painel/);
}

export async function signInPassword(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder("voce@exemplo.com").first().fill(email);
  await page.getByPlaceholder("Sua senha").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel/);
}
