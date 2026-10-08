import { test, expect } from "@playwright/test";
import { CURRENT_TERMS_VERSION } from "../src/lib/consent";
import { sql, codeIn, deleteUsers, lastEmail, linkIn, runPrefix, seedUser, signInPassword, resetLocalRateLimits } from "./helpers";

const prefix = runPrefix();
test.beforeEach(resetLocalRateLimits);
test.afterAll(() => deleteUsers(prefix));

test("sign-up confirms the address before the first sign-in, by code", async ({ page }, info) => {
  const email = `${prefix}-signup-${info.project.name}@example.com`;
  await page.goto("/criar-conta");
  await page.getByPlaceholder("voce@exemplo.com").first().fill(email);
  await page.getByPlaceholder(/Mínimo de/).fill("abcd");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/verificar-email\?email=/);
  await page.screenshot({ path: `test-results/verify-${info.project.name}.png`, fullPage: true });

  // Not yet: right password, unconfirmed address.
  await page.goto("/login");
  await page.getByPlaceholder("voce@exemplo.com").first().fill(email);
  await page.getByPlaceholder("Sua senha").fill("abcd");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("alert").first()).toContainText("Confirme seu e-mail");
  await page.getByRole("link", { name: "Confirmar agora" }).click();

  await page.getByLabel("Código").fill(codeIn((await lastEmail(email)).text));
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.getByText("E-mail confirmado. Entre com sua senha.")).toBeVisible();
  // Terms come after the first sign-in, on "Antes de começar".
  await page.goto("/login");
  await page.getByPlaceholder("voce@exemplo.com").first().fill(email);
  await page.getByPlaceholder("Sua senha").fill("abcd");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Antes de começar" })).toBeVisible();
  for (const box of await page.getByRole("checkbox").all()) await box.check();
  await page.getByRole("button", { name: "Concordar e continuar" }).click();
  await expect(page).toHaveURL(/\/painel/);
  const [row] = await sql`SELECT consent_terms_version FROM users WHERE email = ${email}`;
  expect(row.consent_terms_version).toBe(CURRENT_TERMS_VERSION);
});

test("sign-up with a taken address answers the same and mails the owner instead", async ({ page }, info) => {
  const email = `${prefix}-taken-${info.project.name}@example.com`;
  await seedUser(email, { password: "original" });
  await page.goto("/criar-conta");
  await page.getByPlaceholder("voce@exemplo.com").first().fill(email);
  await page.getByPlaceholder(/Mínimo de/).fill("outra");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/verificar-email\?email=/);
  expect((await lastEmail(email)).subject).toBe("Você já tem uma conta na LabIA");
});

test("the link confirms too, and forgot-password creates a new password that ends old sessions", async ({ page, browser }, info) => {
  const email = `${prefix}-reset-${info.project.name}@example.com`;
  await seedUser(email, { password: "antiga" });
  await signInPassword(page, email, "antiga");

  const other = await browser.newPage();
  await other.goto("/esqueci-senha");
  await other.getByPlaceholder("voce@exemplo.com").fill(email);
  await other.getByRole("button", { name: "Enviar link" }).click();
  await expect(other.getByText("o link chega em instantes")).toBeVisible();
  await other.goto(linkIn((await lastEmail(email)).text));
  await other.getByLabel("Nova senha", { exact: true }).fill("nova1");
  await other.getByLabel("Repita a senha").fill("nova1");
  await other.screenshot({ path: `test-results/reset-${info.project.name}.png`, fullPage: true });
  await other.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(other.getByText("Senha trocada. Entre com a nova senha.")).toBeVisible();

  // The session opened with the old password is gone.
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/login/);
  await signInPassword(page, email, "nova1");
  // The same link does not work twice.
  await other.goto(linkIn((await lastEmail(email)).text));
  await other.getByLabel("Nova senha").fill("terceira");
  await other.getByLabel("Repita a senha").fill("terceira");
  await other.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(other.locator("p[role=alert]")).toContainText("já foi usado");
});
