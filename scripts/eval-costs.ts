// Price-promise report (read-only): for every finished paid step, how far was the price we showed before from the
// real cost? Run after any pricing or model change.  npx tsx --env-file=.env.local scripts/eval-costs.ts
import { prisma } from "../src/lib/prisma";

async function main() {
  const steps = await prisma.step.findMany({ where: { status: { in: ["DONE", "APPROVED"] }, estimatedCostBrl: { not: null }, actualCostBrl: { not: null } }, select: { model: true, kind: true, estimatedCostBrl: true, actualCostBrl: true } });
  const by = new Map<string, { n: number; est: number; act: number; over: number; under: number }>();
  for (const s of steps) {
    const key = `${s.kind} · ${s.model ?? "?"}`;
    const row = by.get(key) ?? { n: 0, est: 0, act: 0, over: 0, under: 0 };
    const est = Number(s.estimatedCostBrl), act = Number(s.actualCostBrl);
    row.n++; row.est += est; row.act += act;
    if (act > est + 0.005) row.over++; else if (act < est - 0.005) row.under++;
    by.set(key, row);
  }
  console.log("step · model | n | estimated | real | drift | real above estimate (the bad case)");
  for (const [key, r] of [...by].sort((a, b) => b[1].n - a[1].n))
    console.log(`${key} | ${r.n} | R$ ${r.est.toFixed(2)} | R$ ${r.act.toFixed(2)} | ${(((r.act - r.est) / (r.est || 1)) * 100).toFixed(1)}% | ${r.over}/${r.n}`);
  if (!by.size) console.log("No finished paid steps yet.");
}
main().finally(() => prisma.$disconnect());
