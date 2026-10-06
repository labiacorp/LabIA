import { afterAll, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { prisma } from "@/lib/prisma";
const auth = vi.hoisted(() => ({ id: "" }));
vi.mock("@/lib/session", () => ({ requireUserId: async () => auth.id }));
import CreditsPage from "./page";
const ids: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({where:{id:{in:ids}}}); });
it("keeps older owned entries reachable after 100 and excludes another account", async () => {
  const owner = await prisma.user.create({data:{email:`balance-ui-${randomUUID()}@example.com`}});
  ids.push(owner.id);
  const other = await prisma.user.create({data:{email:`balance-other-${randomUUID()}@example.com`}});
  ids.push(other.id);
  auth.id = owner.id;
  await prisma.ledgerEntry.createMany({data:Array.from({length:105},(_,i)=>({userId:owner.id,reason:"TOPUP" as const,deltaBrl:1,createdAt:new Date(Date.UTC(2026,0,1,0,0,i)),note:"Disposable UI pagination fixture"}))});
  await prisma.ledgerEntry.create({data:{userId:other.id,reason:"TOPUP",deltaBrl:9876.54,note:"Foreign fixture"}});
  const html = renderToStaticMarkup(await CreditsPage({searchParams:Promise.resolve({page:"999"})}));
  expect(html).toContain("Página 5 de 5");
  expect(html.match(/Créditos da equipe/g)).toHaveLength(5);
  expect(html).toContain("/saldo?page=4");
  expect(html).not.toContain("197.530");
  expect(html).not.toContain("NaN");
});

it("filters the statement by type and keeps the filter on the CSV link", async () => {
  const owner = await prisma.user.create({ data: { email: `balance-filter-${randomUUID()}@example.com` } });
  ids.push(owner.id);
  auth.id = owner.id;
  await prisma.ledgerEntry.createMany({ data: [{ userId: owner.id, reason: "TOPUP", deltaBrl: 17.5, note: "stripe:in_test" }, { userId: owner.id, reason: "REFUND", deltaBrl: 1, note: "fixture" }] });
  const html = renderToStaticMarkup(await CreditsPage({ searchParams: Promise.resolve({ tipo: "devolucoes" }) }));
  expect(html).toContain("Devolvido");
  expect(html).not.toContain("Créditos do mês</p>");
  expect(html).toContain("/saldo/extrato.csv?tipo=devolucoes");
});
