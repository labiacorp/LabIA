// Manual ledger operations (top-ups are manual until payments exist).
//   npx tsx scripts/ledger.ts balance <email>
//   npx tsx scripts/ledger.ts topup <email> <brl> [note]
//   npx tsx scripts/ledger.ts refund <stepId>      reconcile a step stuck in submission_unknown
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const { getBalanceBrl } = await import("../src/lib/ledger");
  const [command, arg, amount, ...note] = process.argv.slice(2);

  if (command === "balance" || command === "topup") {
    const user = await prisma.user.findUnique({ where: { email: (arg ?? "").toLowerCase() } });
    if (!user) throw new Error(`No user with e-mail ${arg}. They need to sign in once first.`);
    if (command === "topup") {
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0 || value > 1000) throw new Error("topup needs an amount between 0 and 1000 (BRL).");
      await prisma.ledgerEntry.create({ data: { userId: user.id, deltaBrl: value, reason: "TOPUP", note: note.join(" ") || "manual top-up" } });
    }
    console.log(`${user.email}: balance R$ ${(await getBalanceBrl(user.id)).toFixed(2)}`);
  } else if (command === "refund") {
    const step = await prisma.step.findUnique({ where: { id: arg ?? "" }, include: { influencer: true } });
    if (!step?.influencer) throw new Error("Step not found.");
    if (step.submissionState !== "submission_unknown") throw new Error(`Refusing: step is ${step.submissionState}, not submission_unknown.`);
    if (await prisma.ledgerEntry.count({ where: { stepId: step.id, reason: "REFUND" } })) throw new Error("Already refunded.");
    await prisma.ledgerEntry.create({ data: { userId: step.influencer.userId, deltaBrl: step.estimatedCostBrl ?? 0, reason: "REFUND", stepId: step.id, note: "Manual reconciliation" } });
    console.log(`Refunded R$ ${step.estimatedCostBrl} for step ${step.id}.`);
  } else {
    console.log("usage: balance <email> | topup <email> <brl> [note] | refund <stepId>");
  }
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
