import { test, expect } from "@playwright/test";
import { deleteUsers, runPrefix, seedUser, signInDev, signInPassword, sql } from "./helpers";

const prefix = runPrefix();
const owner = `${prefix}-owner@example.com`;
const member = `${prefix}-member@example.com`;
test.beforeAll(async () => {
  await seedUser(owner, { role: "OWNER", password: "senha-owner" });
  await seedUser(member, { password: "senha-membro" });
});
test.afterAll(() => deleteUsers(prefix));

test("an owner on a Google-equivalent session tops up an account exactly once", async ({ page }, info) => {
  await signInDev(page, owner);
  await expect(page.locator("a[href=\"/admin\"]").first()).toBeAttached();
  await page.goto(`/admin?q=${encodeURIComponent(member)}`);
  await page.getByText("Adicionar saldo").click();
  await page.getByLabel("Valor (R$)").fill("25");
  await page.getByLabel("Nota").fill("crédito de teste e2e");
  await page.getByRole("button", { name: "Revisar" }).click();
  await expect(page.getByText(`Adicionar R$ 25 ao saldo de ${member}?`)).toBeVisible();
  await page.screenshot({ path: `test-results/admin-review-${info.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByRole("status")).toHaveText("Recarga registrada.");
  const ledger = await sql`SELECT l.delta_brl FROM ledger_entries l JOIN users u ON u.id = l.user_id WHERE u.email = ${member}`;
  expect(ledger.map((e) => Number(e.delta_brl))).toEqual([25]);
  await expect(page.getByText("R$ 25,00").first()).toBeVisible();
  await page.screenshot({ path: `test-results/admin-done-${info.project.name}.png`, fullPage: true });
  await sql`DELETE FROM ledger_entries WHERE user_id IN (SELECT id FROM users WHERE email = ${member})`;
});

test("the same owner signed in by password, and a normal account, get a page that does not exist", async ({ page }) => {
  await signInPassword(page, owner, "senha-owner");
  await expect(page.locator("a[href=\"/admin\"]")).toHaveCount(0);
  await page.goto("/admin");
  await expect(page.locator("h1")).toHaveText("Página não encontrada");
  await page.context().clearCookies();
  await signInPassword(page, member, "senha-membro");
  await page.goto("/admin");
  await expect(page.locator("h1")).toHaveText("Página não encontrada");
});
