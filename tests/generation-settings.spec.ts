import { test, expect } from "@playwright/test";
import { deleteUsers, runPrefix, seedUser, signInPassword, sql, resetLocalRateLimits } from "./helpers";

const prefix = runPrefix();
const email = `${prefix}-owner@example.com`;
const influencerId = `${prefix}-character`;
const portraitId = `${prefix}-portrait`;
const sourceId = `${prefix}-source`;
const shortId = `${prefix}-short`;
test.setTimeout(120_000);

test.beforeAll(async () => {
  const userId = await seedUser(email, { role: "OWNER", password: "settings-test" });
  await sql`INSERT INTO influencers (id,user_id,name,niche,tone,updated_at) VALUES (${influencerId},${userId},'Settings test','Fictional test','Clear',now())`;
  await sql`INSERT INTO steps (id,influencer_id,kind,role,position,status,submission_state,input) VALUES (${prefix + "-front"},${influencerId},'CHARACTER','FRONT',0,'DONE','completed','{}')`;
  await sql`INSERT INTO assets (id,user_id,influencer_id,step_id,kind,role,url,width,height) VALUES (${portraitId},${userId},${influencerId},${prefix + "-front"},'IMAGE','FRONT','/mock/portrait.svg',768,1024)`;
  await sql`UPDATE influencers SET face_asset_id = ${portraitId} WHERE id = ${influencerId}`;
  for (const [id, seconds] of [[sourceId, 12], [shortId, 8]] as const) {
    await sql`INSERT INTO assets (id,user_id,kind,url,storage_key,file_name,duration_sec,width,height) VALUES (${id},${userId},'VIDEO','/mock/video.mp4',${"references/" + id + ".mp4"},${id + ".mp4"},${seconds},720,1280)`;
  }
});
test.beforeEach(resetLocalRateLimits);
test.afterAll(() => deleteUsers(prefix));

test("new content exposes working choices, preserves them and edits the same draft for free", async ({ page }, info) => {
  await signInPassword(page, email, "settings-test");
  await page.goto("/conteudos/novo");
  await page.getByText("Ideia do vídeo", { exact: true }).locator("..").locator("textarea").fill("Settings persistence test");
  await page.getByLabel("Format", { exact: true }).selectOption("16:9");
  const imageModel = page.getByLabel("Modelo de imagem", { exact: true });
  const imageQuality = page.getByLabel("Qualidade da imagem", { exact: true });
  await imageModel.selectOption("fal-ai/nano-banana-2/edit");
  await imageQuality.selectOption("2K");
  const videoModel = page.getByLabel("Modelo de vídeo", { exact: true });
  const videoQuality = page.getByLabel("Qualidade do vídeo", { exact: true });
  const duration = page.getByLabel("Duração do vídeo", { exact: true });
  await videoModel.selectOption("fal-ai/veo3.1/image-to-video");
  await videoQuality.selectOption("1080p");
  await duration.selectOption("8");
  await page.getByRole("checkbox", { name: /^Audio/ }).uncheck();
  await expect(page.locator('input[name="videoAudio"]')).toHaveValue("false");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/new-content-settings-${info.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "Criar conteúdo · grátis" }).click();
  await page.getByRole("link", { name: "Escrever roteiro" }).click();
  await expect(page).toHaveURL(/\/i\/.+\/c\//, { timeout: 60_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Settings persistence test");
  const contentId = page.url().split("/").at(-1)!;
  const saved = await sql`SELECT kind,input,estimated_cost_brl FROM steps WHERE content_id = ${contentId}`;
  expect(saved.find((row) => row.kind === "IMAGE").input.selection).toEqual({ model: "fal-ai/nano-banana-2/edit", resolution: "2K" });
  expect(saved.find((row) => row.kind === "VIDEO").input.selection).toEqual({ model: "fal-ai/veo3.1/image-to-video", strategy: "clip", duration: 8, resolution: "1080p", audio: false });
  await page.getByRole("link", { name: "Edit settings", exact: true }).click();
  await expect(videoModel).toHaveValue("fal-ai/veo3.1/image-to-video");
  await expect(videoQuality).toHaveValue("1080p");
  await expect(duration).toHaveValue("8");
  await videoQuality.selectOption("720p");
  await duration.selectOption("4");
  await page.getByRole("button", { name: "Save settings · free" }).click();
  await page.getByRole("link", { name: "Back to content" }).click();
  await expect(page).toHaveURL(new RegExp(`/c/${contentId}$`), { timeout: 60_000 });
  expect(page.url()).toContain(contentId);
  await page.getByLabel("Roteiro", { exact: true }).fill("A fictional test script.");
  await page.getByRole("button", { name: "Salvar roteiro · grátis" }).click();
  await expect(imageModel).toHaveValue("fal-ai/nano-banana-2/edit");
  await expect(imageQuality).toHaveValue("2K");
  const ledger = await sql`SELECT l.id FROM ledger_entries l JOIN users u ON u.id=l.user_id WHERE u.email=${email}`;
  expect(ledger).toHaveLength(0);
});

test("motion recreation keeps editable model, quality and source duration in the same draft", async ({ page }, info) => {
  await signInPassword(page, email, "settings-test");
  await page.goto("/trends?trend=custom");
  await page.locator('select[name="sourceId"]').selectOption(sourceId);
  await page.locator('select[name="model"]').selectOption("higgsfield/genjutsu/motion-transfer/v1.0");
  await page.locator('select[name="resolution"]').selectOption("480p");
  await page.getByRole("button", { name: "Salvar rascunho (grátis) e ver o custo" }).click();
  await expect(page).toHaveURL(/\/i\/.+\/c\//, { timeout: 60_000 });
  const contentId = page.url().split("/").at(-1)!;
  await page.getByRole("link", { name: "Edit settings", exact: true }).click();
  await expect(page.locator('select[name="model"]')).toHaveValue("higgsfield/genjutsu/motion-transfer/v1.0");
  await expect(page.locator('select[name="resolution"]')).toHaveValue("480p");
  await page.locator('select[name="model"]').selectOption("fal-ai/kling-video/v3/pro/motion-control");
  await page.locator('select[name="sourceId"]').selectOption(shortId);
  await expect(page.locator('select[name="resolution"]')).toHaveValue("default");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/motion-edit-settings-${info.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "Save settings (free) and review cost" }).click();
  await expect(page).toHaveURL(new RegExp(`/c/${contentId}$`), { timeout: 60_000 });
  const [saved] = await sql`SELECT motion FROM contents WHERE id=${contentId}`;
  expect(saved.motion).toMatchObject({ model: "fal-ai/kling-video/v3/pro/motion-control", resolution: "default", sourceId: shortId });
});
