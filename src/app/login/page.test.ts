import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

const state = vi.hoisted(() => ({ open: false, mode: "on" as "on" | "off" | "closed", pass: false }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("@/auth", () => ({ auth: async () => null, accessOpen: () => state.open }));
vi.mock("@/lib/access", () => ({ gateMode: () => state.mode, hasPass: async () => state.pass }));
vi.mock("@/lib/referrals", () => ({ admitted: async () => true }));
vi.mock("./actions", () => ({ loginGoogle: async () => ({}), loginDevelopment: async () => ({}), authenticatePassword: async () => ({}) }));
import LoginPage from "./page";
import { Landing } from "../lp/landing";

const page = () => LoginPage({ searchParams: Promise.resolve({}) });
beforeEach(() => Object.assign(state, { open: false, mode: "on", pass: false }));

it("while closed, the sign-in form exists only behind the team code", async () => {
  await expect(page()).rejects.toThrow("redirect:/");
  state.mode = "off"; // no code configured: nobody gets in, not even with an old pass
  state.pass = true;
  await expect(page()).rejects.toThrow("redirect:/");
  state.mode = "on";
  expect(renderToStaticMarkup(await page())).toContain("Acesso da equipe");
});

it("the landing never mentions invites and offers sign-in only when access is open", () => {
  const numbers = { price: "R$ 49,90", plan: 350, image: 13, video: 70, reels: 4 };
  expect(renderToStaticMarkup(createElement(Landing, { numbers, open: false }))).not.toContain('href="/login"');
  const closed = renderToStaticMarkup(createElement(Landing, { numbers, open: false }));
  expect(closed).not.toContain("Criar conta");
  expect(closed).not.toContain("convite");
  const open = renderToStaticMarkup(createElement(Landing, { numbers, open: true }));
  expect(open).toContain('href="/login"');
  expect(open).toContain("Criar conta");
  expect(open).not.toContain("convite");
});
