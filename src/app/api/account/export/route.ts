import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return new Response(null, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      createdAt: true,
      influencers: {
        select: {
          id: true,
          name: true,
          niche: true,
          tone: true,
          persona: true,
          visualSignature: true,
          contents: {
            select: {
              id: true,
              title: true,
              idea: true,
              aspectRatio: true,
              status: true,
              createdAt: true,
            },
          },
        },
      },
      assets: {
        select: {
          id: true,
          kind: true,
          role: true,
          url: true,
          influencerId: true,
          contentId: true,
          createdAt: true,
        },
      },
      ledger: { select: { deltaBrl: true, reason: true, createdAt: true } },
    },
  });
  if (!user) return new Response(null, { status: 404 });
  return new Response(
    JSON.stringify(
      { exportedAt: new Date().toISOString(), account: user },
      null,
      2,
    ),
    {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="labia-meus-dados.json"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
