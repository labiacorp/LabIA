import { prisma } from "@/lib/prisma";

export async function getBalanceBrl(userId: string) {
  const { _sum } = await prisma.ledgerEntry.aggregate({ where: { userId }, _sum: { deltaBrl: true } });
  return Number(_sum.deltaBrl?.toString() ?? 0);
}
