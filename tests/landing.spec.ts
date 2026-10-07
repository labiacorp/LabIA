import { expect, test, type Page } from "@playwright/test";
import { signInDev } from "./helpers";

// A visitor (no session cookie) lands on the landing at "/"; a signed-in user is sent to Início.
test("a visitor on / sees the landing page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Conteúdo para influencers de IA/);
  await expect(page.getByRole("link", { name: "Criar conta" }).first()).toBeVisible();
  await expect(page.getByText("Quatro etapas. Cada uma com custo.")).toBeVisible();
  await page.getByRole("link", { name: "Entrar", exact: true }).first().click();
  await expect(page).toHaveURL(/\/(login|criar-conta)/);
});

const LANDING = /Conteúdo para influencers de IA/;
const cookie = (name: string, value = "garbage") => ({ name, value, domain: "localhost", path: "/", secure: true });
const seesLanding = async (page: Page, path = "/") => {
  await page.goto(path);
  await expect(page).toHaveTitle(LANDING);
  await expect(page.getByText("Quatro etapas. Cada uma com custo.")).toBeVisible();
};

// The bug this guards: a leftover expired session cookie used to count as "signed in" and bounced the visitor to /login.
for (const name of ["authjs.session-token", "__Secure-authjs.session-token", "authjs.session-token.0"]) {
  test(`a stale ${name} cookie still sees the landing on /`, async ({ page, context }) => {
    await context.addCookies([cookie(name)]);
    await seesLanding(page);
  });
}

for (const [name, value] of [["labia_access", "x"], ["authjs.csrf-token", "x|y"], ["authjs.callback-url", "http://localhost/painel"]]) {
  test(`only a ${name} cookie (not a session) still sees the landing`, async ({ page, context }) => {
    await context.addCookies([cookie(name, value)]);
    await seesLanding(page);
  });
}

test("a query string or hash on / still shows the landing", async ({ page }) => {
  await seesLanding(page, "/?utm_source=whatsapp");
  await expect(page.getByRole("heading", { name: "Dúvidas" })).toBeVisible();
});

test("the stored light theme cannot recolor the landing", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("labia-theme", "light"));
  await seesLanding(page);
  const bg = await page.locator("#topo").evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe("rgb(11, 11, 12)");
});

test("on a phone there is no sideways scroll and the CTAs fit", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seesLanding(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.getByRole("link", { name: "Criar conta" }).first()).toBeInViewport();
});

test("the landing links go to real pages", async ({ page, request }) => {
  await seesLanding(page);
  const hrefs = await page.locator("a[href^='/']").evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("href")!))]);
  expect(hrefs).toEqual(expect.arrayContaining(["/login", "/termos", "/privacidade"]));
  for (const href of hrefs) expect((await request.get(href)).status(), href).toBeLessThan(400);
  for (const id of ["como", "preco", "telas", "duvidas", "comecar"]) await expect(page.locator(`#${id}`)).toHaveCount(1);
});

test("the plan card, the steps and the FAQ respond", async ({ page }) => {
  await seesLanding(page);
  await expect(page.getByText("Créditos por mês")).toBeVisible();
  await expect(page.getByText(/R\$\s?49,90/).first()).toBeVisible();
  await expect(page.getByText(/R\$\s?[0-9]+,[0-9]{2} previsto|~R\$ 5,67|7,02/)).toHaveCount(0);
  await page.getByRole("button", { name: /^03/ }).click();
  await expect(page.getByRole("button", { name: /^03/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "E se a geração falhar?" }).click();
  await expect(page.getByText("que não foram usados voltam e aparecem no extrato")).toBeVisible();
});

test("link previews have art and metadata", async ({ page, request }) => {
  await seesLanding(page);
  const og = await page.locator("meta[property='og:image']").getAttribute("content");
  expect(og).toBeTruthy();
  const res = await request.get(new URL(og!).pathname);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/png");
  await expect(page.locator("meta[name='twitter:card']")).toHaveAttribute("content", "summary_large_image");
});

// Runs only with an existing account in the environment (never committed): LANDING_EMAIL. Dev-provider
// sign-in, because owners have no password; read-only: it only opens pages.
test("a signed-in user goes from / to Início, and the landing stays on /lp", async ({ page }) => {
  const email = process.env.LANDING_EMAIL;
  test.skip(!email, "LANDING_EMAIL not set");
  await signInDev(page, email!);
  await page.goto("/");
  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.locator("#app-content")).toBeVisible();
  await expect(page.getByText("Quatro etapas. Cada uma com custo.")).toHaveCount(0);
  await page.goto("/lp");
  await expect(page.getByText("Quatro etapas. Cada uma com custo.")).toBeVisible();
});

test("security headers are sent and the in-app browser bar shows only inside Instagram", async ({ page, browser }) => {
  const res = await page.goto("/login");
  expect(res!.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(res!.headers()["x-content-type-options"]).toBe("nosniff");
  await expect(page.getByText(/Abrir no navegador|Abrir no navegador/)).toHaveCount(0);
  const ig = await browser.newContext({ userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36 Instagram 330.0.0.0" });
  const igPage = await ig.newPage();
  await igPage.goto("/login");
  await expect(igPage.getByRole("link", { name: /Abrir no navegador/ })).toBeVisible();
  await ig.close();
});

test("the site has icons, a manifest and a robots file that hides the app", async ({ request }) => {
  expect((await request.get("/icon.svg")).status()).toBe(200);
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ name: "LabIA", display: "standalone", theme_color: "#0B0B0C" });
  for (const icon of manifest.icons) expect((await request.get(icon.src)).status(), icon.src).toBe(200);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /painel");
  expect(robots).toContain("Allow: /termos");
});

// Development and e2e run with access open (accessOpen), so every call to action creates an account.
// The closed state (LABIA_CLOSED=1: no sign-in anywhere) is covered by src/app/login/page.test.ts.
test("with access open, every call to action leads to creating an account", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("convite")).toHaveCount(0);
  await page.getByRole("link", { name: "Criar conta" }).last().click();
  await expect(page).toHaveURL(/\/criar-conta/);
});
