import { auth } from "@/auth";
import { collectRunning } from "@/lib/generation";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Entre para continuar." }, { status: 401 });
  const { id } = await params;
  return Response.json(await collectRunning(session.user.id, id));
}
