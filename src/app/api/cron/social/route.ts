import { createHash, timingSafeEqual } from "node:crypto";
import { dispatchDuePosts } from "@/lib/social/posts";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const digest = (value: string) => createHash("sha256").update(value).digest();

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "Cron not configured" }, { status: 503 });
  const given = request.headers.get("authorization") ?? "";
  // Hash both sides so the comparison is constant-time regardless of length.
  if (!timingSafeEqual(digest(given), digest(`Bearer ${secret}`))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await dispatchDuePosts({ limit: 5, budgetMs: 150_000 }));
}
