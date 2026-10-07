import { randomBytes } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { deleteUsers, runPrefix, seedUser, signInDev, sql } from "./helpers";

const prefix = runPrefix();
test.afterAll(() => deleteUsers(prefix));
// `next dev` compiles /integracoes, /biblioteca and the content page on first hit; each test visits several.
test.setTimeout(150_000);

const id = () => `e2e${randomBytes(10).toString("hex")}`;

async function seedMedia(userId: string, kind: "IMAGE" | "VIDEO") {
  await sql`INSERT INTO ledger_entries (id, user_id, delta_brl, reason) VALUES (${id()}, ${userId}, 10, 'TOPUP')`;
  const assetId = id();
  const url = kind === "IMAGE" ? "/mock/portrait.svg" : "/mock/reel.mp4";
  await sql`INSERT INTO assets (id, user_id, kind, url, file_name) VALUES (${assetId}, ${userId}, ${kind}::"AssetKind", ${url}, ${"e2e-" + kind.toLowerCase()})`;
  return assetId;
}

// The mock X backend redirects straight back from /start to the callback, so one click connects.
async function connectX(page: Page) {
  await page.goto("/integracoes");
  await page.locator("article[data-network=X]").getByRole("link", { name: /Conectar/ }).click();
  await expect(page.locator("article[data-network=X]")).toContainText("Conectado como @labia_teste");
}

async function publish(page: Page, text: string, when?: string) {
  const dialog = page.locator("dialog.publish-dialog[open]");
  await dialog.getByRole("checkbox", { name: /@labia_teste/ }).check();
  await dialog.getByRole("textbox").first().fill(text);
  if (when) {
    await dialog.getByRole("radio", { name: "Agendar" }).check();
    await dialog.locator("input[type=datetime-local]").fill(when);
  }
  await dialog.getByRole("button", { name: when ? "Agendar publicação" : "Publicar" }).click();
  await expect(dialog.getByRole("status")).toContainText(when ? "Publicação agendada." : "Publicação enviada.");
  await dialog.getByRole("button", { name: "Fechar publicação" }).click();
}

test("connect X, publish now, schedule, cancel and disconnect", async ({ page }, info) => {
  const email = `${prefix}-flow-${info.project.name}@example.com`;
  const userId = await seedUser(email);
  await seedMedia(userId, "IMAGE");
  await signInDev(page, email);

  await page.goto("/integracoes");
  await expect(page.locator("article[data-network]")).toHaveCount(8);
  // Mock mode: every backend is ready, so all networks but Bluesky are connectable by a regular user.
  for (const id of ["X", "INSTAGRAM", "TIKTOK", "LINKEDIN", "THREADS", "YOUTUBE", "FACEBOOK"])
    await expect(page.locator(`article[data-network=${id}]`)).toContainText("Conectar");
  await expect(page.locator("article[data-network=BLUESKY]")).toContainText("Em breve");
  await connectX(page);

  const openPublish = async () => {
    await page.goto("/biblioteca");
    await page.getByRole("button", { name: "Abrir arquivo" }).click();
    await page.locator("dialog[open]").getByRole("button", { name: "Publicar" }).click();
  };
  await openPublish();
  await publish(page, "Primeiro post de teste");

  // Scheduled for tomorrow, written as the Sao Paulo wall clock the input expects (UTC-03:00).
  const tomorrow = new Date(Date.now() + 24 * 60 * 60_000 - 3 * 60 * 60_000).toISOString().slice(0, 16);
  await openPublish();
  await publish(page, "Post agendado de teste", tomorrow);

  await page.goto("/integracoes");
  const published = page.locator("li[data-status=PUBLISHED]");
  const scheduled = page.locator("li[data-status=SCHEDULED]");
  await expect(published).toContainText("Primeiro post de teste");
  await expect(published).toContainText("Publicado");
  await expect(scheduled).toContainText("Agendado");

  await scheduled.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.locator("li[data-status=CANCELED]")).toContainText("Cancelado");

  const card = page.locator("article[data-network=X]");
  await card.getByRole("button", { name: "Desvincular" }).first().click();
  await card.locator("dialog[open]").getByRole("button", { name: "Desvincular" }).click();
  await expect(card.getByRole("link", { name: /Conectar/ })).toBeVisible();
  await expect(card).not.toContainText("Conectado como");
});

test("the final video on the content page can be published", async ({ page }, info) => {
  const email = `${prefix}-video-${info.project.name}@example.com`;
  const userId = await seedUser(email);
  const assetId = await seedMedia(userId, "VIDEO");
  const influencerId = id();
  const contentId = id();
  const stepId = id();
  await sql`INSERT INTO influencers (id, user_id, name, niche, tone, updated_at) VALUES (${influencerId}, ${userId}, 'Teste', 'n', 't', now())`;
  await sql`INSERT INTO contents (id, influencer_id, title, status, updated_at) VALUES (${contentId}, ${influencerId}, 'Vídeo final de teste', 'REVIEW', now())`;
  await sql`INSERT INTO steps (id, content_id, kind, position, status) VALUES (${stepId}, ${contentId}, 'ASSEMBLY', 0, 'DONE')`;
  await sql`UPDATE assets SET step_id = ${stepId}, content_id = ${contentId}, influencer_id = ${influencerId} WHERE id = ${assetId}`;
  await signInDev(page, email);
  await connectX(page);

  await page.goto(`/i/${influencerId}/c/${contentId}`);
  await page.locator("figure", { hasText: "Vídeo final" }).getByRole("button", { name: "Publicar" }).click();
  await publish(page, "Meu vídeo final");
  await page.goto("/integracoes");
  await expect(page.locator("li[data-status=PUBLISHED]")).toContainText("Meu vídeo final");
});
