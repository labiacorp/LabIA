import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";

// Sliding window per key. A denied hit is not recorded, so insisting does not extend the block.
// ponytail: count-then-insert is not serializable; under heavy concurrency a few extra attempts pass.
// Upgrade path: pg_advisory_xact_lock(hashtext(key)) in the same query.
export async function hit(key: string, limit: number, windowSeconds: number) {
  const rows = await prisma.$queryRaw<{ id: bigint }[]>`
    INSERT INTO rate_limit_events (key, created_at)
    SELECT ${key}, now()
    WHERE (SELECT count(*) FROM rate_limit_events
           WHERE key = ${key} AND created_at > now() - (${windowSeconds}::int * interval '1 second')) < ${limit}::int
    RETURNING id`;
  if (Math.random() < 0.02) await prisma.$executeRaw`DELETE FROM rate_limit_events WHERE created_at < now() - interval '1 day'`;
  return rows.length === 1;
}

export const TOO_MANY_ATTEMPTS = "Muitas tentativas. Espere alguns minutos e tente de novo.";

// Vercel rewrites x-forwarded-for with the client IP; elsewhere it is not trustworthy.
export async function clientIp() {
  const requestHeaders = await headers();
  return requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
}
