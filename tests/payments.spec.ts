import { expect, test } from "@playwright/test";
import { deleteUsers, runPrefix, seedUser, signInDev } from "./helpers";

const prefix = runPrefix();
test.afterAll(() => deleteUsers(prefix));

test("the Stripe webhook refuses anything unsigned", async ({ request }) => {
  const res = await request.post("/api/stripe/webhook", { data: "{}", headers: { "content-type": "application/json" } });
  expect([400, 503]).toContain(res.status());
  const bad = await request.post("/api/stripe/webhook", { data: "{}", headers: { "stripe-signature": "t=1,v1=bad" } });
  expect([400, 503]).toContain(bad.status());
});

test("the credits page offers the monthly plan (or says it is coming) and never Pix", async ({ page }) => {
  const email = `${prefix}-pay@labia.test`;
  await seedUser(email);
  await signInDev(page, email);
  await page.goto("/saldo");
  await expect(page.getByRole("heading", { name: "Plano mensal" })).toBeVisible();
  await expect(page.getByText(/assinatura abre em breve|Assinar por R\$\s?49,90/).first()).toBeVisible();
  await expect(page.getByText(/pix/i)).toHaveCount(0);
  await page.goto("/saldo?assinado=1");
  await expect(page.getByText("Assinatura confirmada")).toBeVisible();
});

test("a brand-new account starts on Início at creating an influencer", async ({ page }) => {
  const email = `${prefix}-novo@labia.test`;
  await seedUser(email);
  await signInDev(page, email);
  await page.goto("/painel");
  await expect(page.getByText("Bora começar")).toBeVisible();
  await expect(page.getByRole("link", { name: "Criar influencer" })).toBeVisible();
});
