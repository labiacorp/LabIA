import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";

// Serialize the count and insert per key. Concurrent guesses must share the same limit.
export async function hit(key: string, limit: number, windowSeconds: number) {
  const accepted = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
      const rows = await tx.$queryRaw<{ id: bigint }[]>`
      INSERT INTO rate_limit_events (key, created_at)
      SELECT ${key}, now()
      WHERE (SELECT count(*) FROM rate_limit_events
             WHERE key = ${key} AND created_at > now() - (${windowSeconds}::int * interval '1 second')) < ${limit}::int
      RETURNING id`;
      return rows.length === 1;
    },
    { maxWait: 10_000, timeout: 10_000 },
  );
  if (Math.random() < 0.02)
    await prisma.$executeRaw`DELETE FROM rate_limit_events WHERE created_at < now() - interval '1 day'`;
  return accepted;
}

// A success clears its own key, so only consecutive failures add up (the login limiter).
export const clearHits = (key: string) => prisma.rateLimitEvent.deleteMany({ where: { key } });

export const TOO_MANY_ATTEMPTS =
  "Muitas tentativas. Espere alguns minutos e tente de novo.";

// Vercel rewrites x-forwarded-for with the client IP; elsewhere it is not trustworthy.
export async function clientIp() {
  const requestHeaders = await headers();
  return (
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "unknown"
  );
}
