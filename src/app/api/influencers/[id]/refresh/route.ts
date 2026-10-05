import { auth } from "@/auth";
import { collectRunning } from "@/lib/generation";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  return Response.json(await collectRunning(session.user.id, id));
}
