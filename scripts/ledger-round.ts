// One-off: puts ledger rows written before whole-credit charging on the credit grid (multiples of CREDIT_BRL).
//   npx tsx scripts/ledger-round.ts check     read-only: off-grid rows, and users whose rows don't add up to the balance
//   npx tsx scripts/ledger-round.ts           dry run: what would change (read-only)
//   npx tsx scripts/ledger-round.ts --apply   rewrites the off-grid rows in one transaction and saves the originals
// Rows are grouped by step (or social post): each group lands on what whole-credit charging would have debited
// (a net spend rounds up, a net credit rounds down, a spend fully refunded nets zero); every row moves to the nearest
// credit and the group's last row absorbs the remainder. A row that ends at zero is deleted. Uses DATABASE_URL.
import { writeFileSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env.local" });

const GRID = 500; // CREDIT_BRL in ten-thousandths of a real (deltaBrl is Decimal(12, 4))

type Row = { id: string; userId: string; stepId: string | null; socialPostId: string | null; delta: number; createdAt: Date };
type Change = { id: string; userId: string; from: number; to: number };

export function roundGroup(rows: Row[]): Change[] {
  const net = rows.reduce((sum, row) => sum + row.delta, 0);
  const target = net < 0 ? -Math.ceil(-net / GRID) * GRID : Math.floor(net / GRID) * GRID;
  const next = rows.map((row) => Math.round(row.delta / GRID) * GRID);
  next[next.length - 1] += target - next.reduce((sum, value) => sum + value, 0);
  return rows.flatMap((row, index) => (next[index] === row.delta ? [] : [{ id: row.id, userId: row.userId, from: row.delta, to: next[index] }]));
}

export function plan(rows: Row[]): Change[] {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = row.stepId ?? row.socialPostId ?? row.id;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.values()].filter((group) => group.some((row) => row.delta % GRID !== 0)).flatMap(roundGroup);
}

const CHECK_OFF_GRID = `SELECT id, user_id, delta_brl FROM ledger_entries WHERE mod(delta_brl, 0.05) <> 0`;
const CHECK_SUMS = `SELECT user_id,
  SUM(CASE WHEN delta_brl > 0 THEN floor(delta_brl / 0.05) ELSE -ceil(-delta_brl / 0.05) END) AS linhas,
  floor(SUM(delta_brl) / 0.05) AS saldo
FROM ledger_entries GROUP BY user_id
HAVING SUM(CASE WHEN delta_brl > 0 THEN floor(delta_brl / 0.05) ELSE -ceil(-delta_brl / 0.05) END) <> floor(SUM(delta_brl) / 0.05)`;

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const mode = process.argv[2];
  const host = new URL(process.env.DATABASE_URL ?? "postgres://unset").host;
  console.log(`database: ${host}`);

  if (mode === "check") {
    const offGrid = await prisma.$queryRawUnsafe<{ id: string; user_id: string; delta_brl: unknown }[]>(CHECK_OFF_GRID);
    const sums = await prisma.$queryRawUnsafe<{ user_id: string; linhas: unknown; saldo: unknown }[]>(CHECK_SUMS);
    const residue = offGrid.reduce((sum, row) => sum + Number(row.delta_brl) * 10000 - Math.round((Number(row.delta_brl) * 10000) / GRID) * GRID, 0);
    console.log(`off-grid rows: ${offGrid.length} · users: ${new Set(offGrid.map((row) => row.user_id)).size} · off-grid residue: R$ ${(residue / 10000).toFixed(4)}`);
    console.log(`users whose rows ≠ balance: ${sums.length}`);
    for (const row of sums) console.log(`  ${row.user_id}: rows ${row.linhas} credits, balance ${row.saldo} credits (${Number(row.saldo) - Number(row.linhas)})`);
    await prisma.$disconnect();
    return;
  }

  const users = (await prisma.$queryRawUnsafe<{ user_id: string }[]>(`SELECT DISTINCT user_id FROM ledger_entries WHERE mod(delta_brl, 0.05) <> 0`)).map((row) => row.user_id);
  const rows: Row[] = (await prisma.ledgerEntry.findMany({ where: { userId: { in: users } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }))
    .map((row) => ({ id: row.id, userId: row.userId, stepId: row.stepId, socialPostId: row.socialPostId, delta: Math.round(Number(row.deltaBrl) * 10000), createdAt: row.createdAt }));
  const changes = plan(rows);
  const perUser = new Map<string, number>();
  for (const change of changes) perUser.set(change.userId, (perUser.get(change.userId) ?? 0) + change.to - change.from);
  console.log(`rows to change: ${changes.length} (${changes.filter((change) => change.to === 0).length} end at zero and are deleted) · users: ${perUser.size}`);
  for (const [userId, delta] of perUser) console.log(`  ${userId}: balance ${delta >= 0 ? "+" : ""}${delta / GRID} credits (R$ ${(delta / 10000).toFixed(4)})`);

  if (mode === "--apply" && changes.length) {
    const backup = `.handoff/ledger-round-${host.split(".")[0]}-${Date.now()}.json`;
    writeFileSync(backup, JSON.stringify(changes.map((change) => ({ ...change, from: change.from / 10000, to: change.to / 10000 })), null, 2));
    await prisma.$transaction(changes.map((change) => change.to === 0
      ? prisma.ledgerEntry.delete({ where: { id: change.id } })
      : prisma.ledgerEntry.update({ where: { id: change.id }, data: { deltaBrl: change.to / 10000 } })));
    console.log(`applied; originals saved to ${backup}`);
  } else if (mode !== "--apply") console.log("dry run: nothing written (pass --apply to write)");
  await prisma.$disconnect();
}

if (process.argv[1]?.endsWith("ledger-round.ts")) main().catch((error) => { console.error(error.message); process.exit(1); });
