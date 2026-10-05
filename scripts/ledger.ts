// Manual ledger operations (top-ups are manual until payments exist).
//   npx tsx scripts/ledger.ts balance <email>
//   npx tsx scripts/ledger.ts topup <email> <brl> [note]
//   npx tsx scripts/ledger.ts refund <stepId> [verifiedActualBrl]   reconcile an uncertain submission/duration; video requires the actual cost
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
    const { reconcileReservation } = await import("../src/lib/generation");
    if ((step.kind === "VIDEO" || step.provider === "higgsfield") && amount === undefined) throw new Error("Video reconciliation requires the TOTAL actual cost in BRL, verified in the provider dashboard.");
    const result = await reconcileReservation(step.influencer.userId, step.id, Number(amount ?? 0));
    console.log(`Reconciled step ${step.id}: actual R$ ${result.actualBrl.toFixed(4)}, adjustment R$ ${result.adjustmentBrl.toFixed(4)}.`);
  } else {
    console.log("usage: balance <email> | topup <email> <brl> [note] | refund <stepId> [verifiedActualBrl]");
  }
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
