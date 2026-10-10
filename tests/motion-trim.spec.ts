import { test, expect } from "@playwright/test";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createFile } from "mp4box";
import { deleteUsers, resetLocalRateLimits, runPrefix, seedUser, signInPassword, sql } from "./helpers";

const prefix = runPrefix();
const email = `${prefix}-trim@example.com`;
const character = `${prefix}-character`;
const portrait = `${prefix}-portrait`;
const original = `${prefix}-original`;
const legacy = `${prefix}-legacy`;
const storageRoot = path.resolve(".handoff/reference-uploads");
test.setTimeout(120_000);

test.beforeAll(async () => {
  const user = await seedUser(email, { role: "OWNER", password: "trim-test" });
  await sql`INSERT INTO influencers (id,user_id,name,niche,tone,updated_at) VALUES (${character},${user},'Trim test','Fictional','Clear',now())`;
  await sql`INSERT INTO steps (id,influencer_id,kind,role,position,status,submission_state,input) VALUES (${prefix + "-front"},${character},'CHARACTER','FRONT',0,'DONE','completed','{}')`;
  await sql`INSERT INTO assets (id,user_id,influencer_id,step_id,kind,role,url,width,height) VALUES (${portrait},${user},${character},${prefix + "-front"},'IMAGE','FRONT','/mock/portrait.svg',768,1024)`;
  await sql`UPDATE influencers SET face_asset_id=${portrait} WHERE id=${character}`;
  const bytes = await readFile("tests/fixtures/trim-with-audio.mp4");
  await mkdir(path.join(storageRoot, "references"), { recursive: true });
  await writeFile(path.join(storageRoot, "references", `${original}.mp4`), bytes, { flag: "wx" });
  await sql`INSERT INTO assets (id,user_id,kind,url,storage_key,file_name,content_type,size_bytes,duration_sec,width,height) VALUES (${original},${user},'VIDEO',${"/api/assets/" + original + "/file"},${"local:references/" + original + ".mp4"},'Original with audio.mp4','video/mp4',${bytes.length},6,320,480)`;
  const oldCut = await readFile("tests/fixtures/legacy-four-second.mp4");
  await writeFile(path.join(storageRoot, "references", `${legacy}.mp4`), oldCut, { flag: "wx" });
  await sql`INSERT INTO assets (id,user_id,kind,url,storage_key,file_name,content_type,size_bytes,duration_sec,width,height) VALUES (${legacy},${user},'VIDEO',${"/api/assets/" + legacy + "/file"},${"local:references/" + legacy + ".mp4"},'Older silent cut.mp4','video/mp4',${oldCut.length},4,320,480)`;
});
test.beforeEach(resetLocalRateLimits);
test.afterAll(async () => {
  const files = await sql`SELECT a.storage_key FROM assets a JOIN users u ON u.id=a.user_id WHERE u.email=${email} AND a.storage_key IS NOT NULL`;
  await deleteUsers(prefix);
  for (const file of files) {
    if (!/^local:references\/[a-zA-Z0-9_-]+\.mp4$/.test(file.storage_key)) continue;
    const target = path.resolve(storageRoot, file.storage_key.slice(6));
    if (!target.startsWith(storageRoot + path.sep)) throw new Error("Fixture cleanup escaped its root");
    await unlink(target).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
  }
});

test("a four-second cut keeps audio, reopens after navigation and restores its original after saving", async ({ page }, info) => {
  await signInPassword(page, email, "trim-test");
  await page.goto("/trends?trend=dance");
  const source = page.locator('select[name="sourceId"]');
  await source.selectOption(original);
  await page.locator('select[name="model"]').selectOption("fal-ai/kling-video/v2.6/standard/motion-control");
  await page.getByRole("button", { name: "Edit cut", exact: true }).click();
  await page.getByLabel("Seconds to keep").fill("4");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByLabel("Seconds to keep")).toHaveCount(0);
  await expect(source).toHaveValue(original);
  await page.getByRole("button", { name: "Edit cut", exact: true }).click();
  await page.getByLabel("Seconds to keep").fill("4");
  await page.getByRole("button", { name: "Create short version", exact: true }).click();
  await expect(source).not.toHaveValue(original, { timeout: 60_000 });
  const cut = await source.inputValue();
  await expect(page.getByRole("button", { name: "Use original video", exact: true })).toBeVisible();
  await page.goto("/painel");
  await page.goto("/trends?trend=dance");
  await expect(source).toHaveValue(cut);
  await page.locator('select[name="model"]').selectOption("fal-ai/kling-video/v2.6/standard/motion-control");
  await page.getByRole("button", { name: "Edit cut", exact: true }).click();
  await expect(page.getByLabel("Seconds to keep")).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `test-results/motion-trim-${info.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.locator('input[name="keepSound"]').check();
  await expect(page.locator('select[name="model"]')).toHaveValue("fal-ai/kling-video/v2.6/standard/motion-control");
  await page.getByRole("button", { name: "Salvar rascunho (grátis) e ver o custo" }).click();
  await expect(page).toHaveURL(/\/i\/.+\/c\//, { timeout: 60_000 });
  await expect(page.getByRole("link", { name: "Edit settings", exact: true })).toBeVisible();
  const file = await page.request.get(`/api/assets/${cut}/file`);
  expect(file.ok()).toBe(true);
  const mp4 = createFile();
  // Node Buffer can be a view into a larger allocation; copy its exact bytes before parsing.
  const exact = new Uint8Array(await file.body()).slice().buffer as ArrayBuffer & { fileStart: number };
  exact.fileStart = 0;
  mp4.appendBuffer(exact as never);
  mp4.flush();
  expect(mp4.getInfo().audioTracks).toHaveLength(1);
  expect(mp4.getInfo().duration / mp4.getInfo().timescale).toBe(4);
  await page.evaluate(() => localStorage.clear());
  await page.getByRole("link", { name: "Edit settings", exact: true }).click();
  await expect(source).toHaveValue(cut);
  await expect(page.locator('input[name="originalSourceId"]')).toHaveValue(original);
  await expect(page.locator('select[name="model"]')).toHaveValue("fal-ai/kling-video/v2.6/standard/motion-control");
  await page.getByRole("button", { name: "Use original video", exact: true }).click();
  await expect(source).toHaveValue(original);
  const ledger = await sql`SELECT l.id FROM ledger_entries l JOIN users u ON u.id=l.user_id WHERE u.email=${email}`;
  expect(ledger).toHaveLength(0);
});

test("an older four-second cut can explicitly choose its original and reopen editing", async ({ page }) => {
  await signInPassword(page, email, "trim-test");
  await page.goto("/trends?trend=dance");
  const source = page.locator('select[name="sourceId"]');
  await source.selectOption(legacy);
  await page.getByRole("button", { name: "Edit cut", exact: true }).click();
  await expect(page.getByLabel("Seconds to keep")).toBeDisabled();
  await page.getByLabel("Original video", { exact: true }).selectOption(original);
  await expect(page.getByLabel("Seconds to keep")).toBeEnabled();
  await page.getByRole("button", { name: "Use original video", exact: true }).click();
  await expect(source).toHaveValue(original);
  await page.reload();
  await expect(source).toHaveValue(original);
});

test("canceling an in-flight cut keeps the original selected when the late result arrives", async ({ page }) => {
  await signInPassword(page, email, "trim-test");
  await page.goto("/trends?trend=dance");
  const source = page.locator('select[name="sourceId"]');
  await source.selectOption(original);
  const before = await source.locator("option").count();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route(/\/trends\?trend=dance$/, async (route) => {
    if (route.request().method() === "POST" && route.request().headers()["next-action"]) await gate;
    await route.continue();
  });
  await page.getByRole("button", { name: "Edit cut", exact: true }).click();
  await page.getByLabel("Seconds to keep").fill("4");
  await page.getByRole("button", { name: "Create short version", exact: true }).click();
  await expect(page.getByRole("button", { name: "Cutting…", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  const completed = page.waitForResponse((response) => response.request().method() === "POST" && Boolean(response.request().headers()["next-action"]));
  release();
  await completed;
  await expect(source.locator("option")).toHaveCount(before + 1);
  await expect(source).toHaveValue(original);
  await page.reload();
  await expect(source).toHaveValue(original);
});
