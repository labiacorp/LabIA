import { notFound } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { requireOwner } from "@/lib/owner";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { saveConnectedAccounts } from "@/lib/social/accounts";
import { openToken } from "@/lib/social/crypto";
import { SocialError } from "@/lib/social/errors";
import { backendReady, connectBackend, getPublisher } from "@/lib/social/publisher";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ backend: string }> }) {
  const { backend } = await params;
  if (backend !== "x" && backend !== "bundle") notFound();
  const userId = await requireUserId();
  if (backend === "bundle") await requireOwner();

  const origin = process.env.NODE_ENV === "production" && process.env.LABIA_PUBLIC_URL ? process.env.LABIA_PUBLIC_URL : request.nextUrl.origin;
  const cookieName = `labia_social_${backend}`;
  const done = (query: string) => {
    const response = NextResponse.redirect(new URL(`/integracoes?${query}`, origin));
    response.cookies.set(cookieName, "", { path: `/api/integrations/${backend}`, maxAge: 0 });
    return response;
  };
  if (!backendReady(backend)) return done("erro=config");

  const sealed = request.cookies.get(cookieName)?.value;
  if (!sealed || request.nextUrl.searchParams.has("error")) return done(`erro=${backend}`);

  let stored: { userId?: unknown; secret?: unknown; influencerId?: unknown };
  try {
    stored = JSON.parse(openToken(sealed, `oauth:${backend}`));
  } catch {
    return done(`erro=${backend}`);
  }
  if (stored.userId !== userId) return done(`erro=${backend}`);
  const secret = typeof stored.secret === "string" ? stored.secret : null;

  try {
    const accounts = await getPublisher(connectBackend(backend)).finishConnect({
      userId,
      redirectUri: `${origin}/api/integrations/${backend}/callback`,
      params: request.nextUrl.searchParams,
      secret,
    });
    // The influencer id is only trusted when it belongs to the signed-in user.
    const claimed = typeof stored.influencerId === "string" ? stored.influencerId : null;
    const influencer = claimed ? await prisma.influencer.findFirst({ where: { id: claimed, userId }, select: { id: true } }) : null;
    await saveConnectedAccounts(userId, connectBackend(backend), accounts, influencer?.id);
    return done(`conectado=${backend}`);
  } catch (error) {
    return done(error instanceof SocialError ? "erro=ocupada" : `erro=${backend}`);
  }
}
