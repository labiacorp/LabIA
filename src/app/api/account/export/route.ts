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
      bio: true,
      referralCode: true,
      _count: { select: { referrals: true } },
      avatar: true,
      defaultAspectRatio: true,
      defaultContentView: true,
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
              motion: true,
              aspectRatio: true,
              archivedAt: true,
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
          fileName: true,
          contentType: true,
          sizeBytes: true,
          influencerId: true,
          contentId: true,
          createdAt: true,
        },
      },
      templates: {
        select: {
          name: true,
          title: true,
          idea: true,
          script: true,
          aspectRatio: true,
          createdAt: true,
        },
      },
      ledger: { select: { deltaBrl: true, reason: true, createdAt: true } },
    },
  });
  if (!user) return new Response(null, { status: 404 });
  const { avatar, ...profile } = user;
  return new Response(
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        account: {
          ...profile,
          photo: avatar
            ? {
                mimeType: "image/webp",
                base64: Buffer.from(avatar).toString("base64"),
              }
            : null,
        },
      },
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
