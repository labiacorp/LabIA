import { expect, test } from "@playwright/test";
import { signInDev } from "./helpers";

// A visitor (no session cookie) lands on the landing at "/"; a signed-in user keeps the studio there.
test("a visitor on / sees the landing page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Conteúdo para influencers de IA/);
  await expect(page.getByRole("link", { name: "Tenho um código" }).first()).toBeVisible();
  await expect(page.getByText("Seis etapas. Cada uma com preço.")).toBeVisible();
  await page.getByRole("link", { name: "Entrar", exact: true }).first().click();
  await expect(page).toHaveURL(/\/(login|acesso)/);
});

// Runs only with an existing account in the environment (never committed): LANDING_EMAIL. Dev-provider
// sign-in, because owners have no password; read-only: it only opens pages.
test("a signed-in user gets the studio on /, and the landing stays on /lp", async ({ page }) => {
  const email = process.env.LANDING_EMAIL;
  test.skip(!email, "LANDING_EMAIL not set");
  await signInDev(page, email!);
  await page.goto("/");
  await expect(page.locator("#app-content")).toBeVisible();
  await expect(page.getByText("Seis etapas. Cada uma com preço.")).toHaveCount(0);
  await page.goto("/lp");
  await expect(page.getByText("Seis etapas. Cada uma com preço.")).toBeVisible();
});
