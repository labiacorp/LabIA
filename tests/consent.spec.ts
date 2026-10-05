import { test, expect } from "@playwright/test";
import { acceptConsent, deleteUsers, resetLocalRateLimits, runPrefix, seedUser, signInPassword, sql } from "./helpers";

const prefix = runPrefix();
test.beforeEach(resetLocalRateLimits);
test.afterAll(() => deleteUsers(prefix));

test("an account with no acceptance on record is held at the Terms until it accepts, once", async ({ page }, info) => {
  const email = `${prefix}-held-${info.project.name}@example.com`;
  await seedUser(email, { password: "senha", consent: false });
  await page.goto("/login");
  await page.getByPlaceholder("voce@exemplo.com").first().fill(email);
  await page.getByPlaceholder("Sua senha").fill("senha");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/consentimento/);
  await page.goto("/conta");
  await expect(page).toHaveURL(/\/consentimento/);
  await page.screenshot({ path: `test-results/consent-${info.project.name}.png`, fullPage: true });
  await acceptConsent(page);
  const [row] = await sql`SELECT consent_accepted_at, consent_terms_version FROM users WHERE email = ${email}`;
  expect(row.consent_terms_version).toBe("2026-10");
  await page.goto("/consentimento");
  await expect(page).toHaveURL(/\/painel/);
});

test("accounts created before tracking began are never asked", async ({ page }, info) => {
  const email = `${prefix}-old-${info.project.name}@example.com`;
  await seedUser(email, { password: "senha", consent: false });
  await sql`UPDATE users SET created_at = '2026-10-01' WHERE email = ${email}`;
  await signInPassword(page, email, "senha");
});

test("the legal pages are public", async ({ page }) => {
  await page.goto("/termos");
  await expect(page.locator("h1")).toHaveText("Termos de Uso");
  await page.goto("/privacidade");
  await expect(page.locator("h1")).toHaveText("Política de Privacidade");
});
