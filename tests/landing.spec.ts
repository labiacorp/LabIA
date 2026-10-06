import { expect, test, type Page } from "@playwright/test";
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

const LANDING = /Conteúdo para influencers de IA/;
const cookie = (name: string, value = "garbage") => ({ name, value, domain: "localhost", path: "/", secure: true });
const seesLanding = async (page: Page, path = "/") => {
  await page.goto(path);
  await expect(page).toHaveTitle(LANDING);
  await expect(page.getByText("Seis etapas. Cada uma com preço.")).toBeVisible();
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
  await expect(page.getByRole("link", { name: "Tenho um código" }).first()).toBeInViewport();
});

test("the landing links go to real pages", async ({ page, request }) => {
  await seesLanding(page);
  const hrefs = await page.locator("a[href^='/']").evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("href")!))]);
  expect(hrefs).toEqual(expect.arrayContaining(["/login", "/acesso", "/termos", "/privacidade"]));
  for (const href of hrefs) expect((await request.get(href)).status(), href).toBeLessThan(400);
  for (const id of ["como", "preco", "telas", "duvidas", "convite"]) await expect(page.locator(`#${id}`)).toHaveCount(1);
});

test("the price calculator and the steps respond", async ({ page }) => {
  await seesLanding(page);
  const slider = page.getByRole("slider", { name: "Vídeos por mês" });
  await slider.fill("30");
  await expect(page.getByText("30 × ~R$ 7,02")).toBeVisible();
  await page.getByRole("button", { name: /^03/ }).click();
  await expect(page.getByRole("button", { name: /^03/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "E se a geração falhar?" }).click();
  await expect(page.getByText("volta inteiro para o seu saldo")).toBeVisible();
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
