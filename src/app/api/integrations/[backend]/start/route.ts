import { notFound } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { requireOwner } from "@/lib/owner";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { sealToken } from "@/lib/social/crypto";
import { backendReady, connectBackend, getPublisher } from "@/lib/social/publisher";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ backend: string }> }) {
  const { backend } = await params;
  if (backend !== "x" && backend !== "bundle") notFound();
  const userId = await requireUserId();
  if (backend === "bundle") await requireOwner();

  const origin = process.env.NODE_ENV === "production" && process.env.LABIA_PUBLIC_URL ? process.env.LABIA_PUBLIC_URL : request.nextUrl.origin;
  const back = (query: string) => NextResponse.redirect(new URL(`/integracoes?${query}`, origin));
  if (!backendReady(backend)) return back("erro=config");

  const requested = request.nextUrl.searchParams.get("influencerId");
  const influencer = requested ? await prisma.influencer.findFirst({ where: { id: requested, userId }, select: { id: true } }) : null;

  try {
    const redirectUri = `${origin}/api/integrations/${backend}/callback`;
    const { url, secret } = await getPublisher(connectBackend(backend)).startConnect({ userId, redirectUri });
    const response = NextResponse.redirect(url);
    response.cookies.set(`labia_social_${backend}`, sealToken(JSON.stringify({ userId, secret, influencerId: influencer?.id ?? null }), `oauth:${backend}`), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: `/api/integrations/${backend}`,
    });
    return response;
  } catch {
    return back(`erro=${backend}`);
  }
}
