import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("@/auth", () => ({ auth: async () => null }));
vi.mock("./actions", () => ({ loginGoogle: async () => ({}), loginDevelopment: async () => ({}), authenticatePassword: async () => ({}) }));
import LoginPage from "./page";
import { Landing } from "../lp/landing";

it("the login page is the same for everyone: no access code, no invite, a link to create an account", async () => {
  const html = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({}) }));
  expect(html).toContain('href="/criar-conta"');
  expect(html).not.toMatch(/código de acesso|convite|Acesso da equipe/i);
});

it("the landing never mentions invites and offers sign-in only when access is open", () => {
  const numbers = { price: "R$ 49,90", plan: 350, image: 13, video: 70, reels: 4 };
  expect(renderToStaticMarkup(createElement(Landing, { numbers, open: false }))).not.toContain('href="/login"');
  const closed = renderToStaticMarkup(createElement(Landing, { numbers, open: false }));
  expect(closed).not.toContain("Criar conta");
  expect(closed).not.toContain("convite");
  const open = renderToStaticMarkup(createElement(Landing, { numbers, open: true }));
  expect(open).toContain('href="/login"');
  expect(open).toContain('href="/criar-conta"');
  expect(open).toContain("Criar conta");
  expect(open).not.toContain("convite");
});
