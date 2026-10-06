import { prisma } from "@/lib/prisma";
import { verifyBundleSignature } from "@/lib/social/bundle";
import { applyOutcome } from "@/lib/social/posts";
import type { PublishOutcome } from "@/lib/social/publisher";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = await request.text(); // the signature covers the exact bytes
  if (!verifyBundleSignature(raw, request.headers.get("x-signature"))) return new Response(null, { status: 401 });

  let event: { type?: unknown; data?: { id?: unknown; status?: unknown; externalData?: Record<string, { permalink?: unknown } | undefined> } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  const data = event.data;
  if (event.type !== "post.published" || typeof data?.id !== "string") return new Response(null, { status: 200 });
  if (data.status !== "POSTED" && data.status !== "ERROR") return new Response(null, { status: 200 });

  const post = await prisma.socialPost.findFirst({
    where: { providerPostId: data.id, account: { backend: "bundle" } },
    select: { id: true, status: true, account: { select: { network: true } } },
  });
  // Unknown post, or one that already left the open states: acknowledge so bundle.social stops retrying.
  if (!post || (post.status !== "SCHEDULED" && post.status !== "PUBLISHING")) return new Response(null, { status: 200 });

  let outcome: PublishOutcome;
  if (data.status === "POSTED") {
    const permalink = data.externalData?.[post.account.network]?.permalink; // bundle types share LabIA's network ids
    outcome = { state: "published", providerPostId: data.id, url: typeof permalink === "string" && permalink ? permalink : null };
  } else {
    outcome = { state: "failed", reason: "platform_error" };
  }
  await applyOutcome(post.id, outcome); // forward-only; an error here becomes a 500 and bundle.social retries
  return new Response(null, { status: 200 });
}
