import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { balanceCredits, costCredits } from "@/lib/plan";
import { ledgerFilter } from "../ledger-filter";

const cell = (value: string) => `"${value.replaceAll('"', '""')}"`;

// The signed-in user's statement as CSV, in credits, with the same filter as the page.
export async function GET(request: Request) {
  const userId = await requireUserId();
  const filter = ledgerFilter(new URL(request.url).searchParams.get("tipo") ?? undefined);
  const entries = await prisma.ledgerEntry.findMany({
    where: { userId, ...(filter.reasons ? { reason: { in: [...filter.reasons] } } : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 5000,
    include: { step: { select: { content: { select: { title: true } }, influencer: { select: { name: true } } } } },
  });
  const rows = entries.map((entry) => {
    const delta = Number(entry.deltaBrl);
    const credits = delta > 0 ? balanceCredits(delta) : -costCredits(-delta);
    return [entry.createdAt.toISOString(), entry.reason, String(credits), entry.step?.content?.title ?? entry.step?.influencer?.name ?? ""].map(cell).join(",");
  });
  return new Response(["data,tipo,creditos,referencia", ...rows].join("\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="labia-extrato.csv"' },
  });
}
