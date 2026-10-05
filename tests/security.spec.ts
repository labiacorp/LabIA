import { test, expect, type Page } from "@playwright/test";
import { deleteUsers, lastEmail, linkIn, resetLocalRateLimits, runPrefix, seedUser, signInDev, signInPassword, sql } from "./helpers";

const prefix = runPrefix();
test.beforeEach(resetLocalRateLimits);
test.afterAll(() => deleteUsers(prefix));

const openRow = async (page: Page, label: string) => {
  await page.goto("/conta/seguranca");
  await page.locator("button.account-settings-row", { hasText: label }).click();
  return page.locator("dialog[open]");
};

test("changing the password asks for the current one and signs every other browser out", async ({ page, browser }, info) => {
  const email = `${prefix}-pw-${info.project.name}@example.com`;
  await seedUser(email, { password: "velha" });
  await signInPassword(page, email, "velha");
  const other = await (await browser.newContext()).newPage();
  await signInPassword(other, email, "velha");

  await page.goto("/conta/seguranca");
  await page.screenshot({ path: `test-results/security-${info.project.name}.png`, fullPage: true });
  let dialog = await openRow(page, "Senha");
  await dialog.getByLabel("Senha atual").fill("errada");
  await dialog.getByLabel("Nova senha").fill("nova1");
  await dialog.getByRole("button", { name: "Salvar senha" }).click();
  await expect(dialog.locator("p[role=alert]")).toHaveText("Senha atual incorreta.");

  dialog = await openRow(page, "Senha");
  await dialog.getByLabel("Senha atual").fill("velha");
  await dialog.getByLabel("Nova senha").fill("nova1");
  await dialog.getByRole("button", { name: "Salvar senha" }).click();
  await expect(page.getByText("Senha alterada. Os outros navegadores saíram da conta.")).toBeVisible();

  await other.goto("/painel");
  await expect(other).toHaveURL(/\/login/);
  await signInPassword(other, email, "nova1");
});

test("a new e-mail only takes over once confirmed from its own inbox", async ({ page }, info) => {
  const email = `${prefix}-mail-${info.project.name}@example.com`;
  const next = `${prefix}-mail-new-${info.project.name}@example.com`;
  await seedUser(email, { password: "senha" });
  await signInPassword(page, email, "senha");
  const dialog = await openRow(page, "E-mail");
  await dialog.getByLabel("Novo e-mail").fill(next);
  await dialog.getByLabel("Senha atual").fill("senha");
  await dialog.getByRole("button", { name: "Enviar link" }).click();
  await expect(dialog.locator("p[role=status]")).toContainText("continua valendo");
  expect((await sql`SELECT email FROM users WHERE email = ${email}`)).toHaveLength(1);

  await page.goto(linkIn((await lastEmail(next)).text));
  await page.getByRole("button", { name: "Confirmar e-mail" }).click();
  await expect(page.getByText("E-mail alterado. Entre com o novo endereço.")).toBeVisible();
  expect((await lastEmail(email)).subject).toBe("O e-mail da sua conta LabIA mudou");
  await signInPassword(page, next, "senha");
});

test("deleting the account waits for running generations, then removes everything", async ({ page }, info) => {
  const email = `${prefix}-del-${info.project.name}@example.com`;
  const userId = await seedUser(email, { password: "senha" });
  await sql`INSERT INTO influencers (id, user_id, name, niche, tone, updated_at) VALUES (${userId + "i"}, ${userId}, 'Teste', 'n', 't', now())`;
  await sql`INSERT INTO steps (id, influencer_id, kind, position, status) VALUES (${userId + "s"}, ${userId + "i"}, 'CHARACTER', 0, 'RUNNING')`;
  await signInPassword(page, email, "senha");

  const tryDelete = async () => {
    const dialog = await openRow(page, "Excluir conta");
    await dialog.getByLabel("Digite EXCLUIR para confirmar").fill("excluir");
    await dialog.getByLabel("Senha atual").fill("senha");
    await dialog.getByRole("button", { name: "Excluir minha conta" }).click();
    return dialog;
  };
  await expect((await tryDelete()).locator("p[role=alert]")).toContainText("geração em andamento");
  expect(await sql`SELECT id FROM users WHERE id = ${userId}`).toHaveLength(1);

  await sql`UPDATE steps SET status = 'DONE' WHERE id = ${userId + "s"}`;
  await tryDelete();
  await expect(page.getByText("Sua conta foi excluída.")).toBeVisible();
  expect(await sql`SELECT id FROM users WHERE id = ${userId}`).toHaveLength(0);
  expect(await sql`SELECT id FROM influencers WHERE id = ${userId + "i"}`).toHaveLength(0);
});

test("a Google-only account fresh from sign-in can add a password without typing one", async ({ page }, info) => {
  const email = `${prefix}-google-${info.project.name}@example.com`;
  await signInDev(page, email);
  const dialog = await openRow(page, "Senha");
  await expect(dialog.getByLabel("Senha atual")).toHaveCount(0);
  await dialog.getByLabel("Nova senha").fill("primeira");
  await dialog.getByRole("button", { name: "Salvar senha" }).click();
  await expect(dialog.locator("p[role=status]")).toContainText("Senha criada");
});
