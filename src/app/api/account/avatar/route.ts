import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
export async function GET() {
  const userId = (await auth())?.user?.id;
  if (!userId) return new Response(null, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatar: true },
  });
  if (!user?.avatar) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(user.avatar), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
