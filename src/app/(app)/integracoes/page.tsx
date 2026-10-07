import { auth } from "@/auth";
import { PageHeading } from "@/components/app/page-heading";
import { Alert } from "@/components/ui/alert";
import { ownerSession } from "@/lib/owner";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { NETWORKS, networkVisible } from "@/lib/social/networks";
import { dispatchDuePosts, reconcileScheduled } from "@/lib/social/posts";
import { backendReady } from "@/lib/social/publisher";
import { NetworkCard, type CardAccount } from "./network-card";
import { PostList, type PostRow } from "./post-list";

export const maxDuration = 300;

const ERRORS: Record<string, string> = {
  x: "Não foi possível conectar o X. Tente de novo.",
  ocupada: "Esta conta já está conectada a outro usuário da LabIA.",
  config: "Esta integração ainda não está configurada.",
  bundle: "Não foi possível concluir a conexão. Tente de novo.",
};

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ conectado?: string; erro?: string }> }) {
  const userId = await requireUserId();
  const params = await searchParams;
  const session = await auth();
  const role = ownerSession(session)
    ? (await prisma.user.findUnique({ where: { id: userId }, select: { role: true } }))?.role
    : null;
  const owner = role === "OWNER";

  try {
    await dispatchDuePosts({ userId, limit: 2 });
    await reconcileScheduled(userId);
  } catch {
    // Best effort: the page renders even if a backend is down.
  }

  const [accounts, scheduled, posts] = await Promise.all([
    prisma.socialAccount.findMany({ where: { userId, status: { not: "DISCONNECTED" } }, orderBy: { connectedAt: "desc" } }),
    prisma.socialPost.groupBy({ by: ["accountId"], where: { userId, status: "SCHEDULED" }, _count: { _all: true } }),
    prisma.socialPost.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { account: { select: { network: true, handle: true } }, asset: { select: { kind: true, url: true } } },
    }),
  ]);
  const counts = new Map(scheduled.map((row) => [row.accountId, row._count._all]));
  const rows: PostRow[] = posts.map((post) => ({
    id: post.id,
    network: post.account.network,
    handle: post.account.handle,
    text: post.text,
    status: post.status,
    scheduledAt: post.scheduledAt.toISOString(),
    publishedAt: post.publishedAt?.toISOString() ?? null,
    url: post.url,
    error: post.error,
    estimatedCost: Number(post.estimatedCostBrl),
    actualCost: post.actualCostBrl === null ? null : Number(post.actualCostBrl),
    media: post.asset && (post.asset.kind === "IMAGE" || post.asset.kind === "VIDEO") ? post.asset : null,
  }));

  return (
    <div className="mx-auto max-w-content">
      <PageHeading title="Integrações" description="Conecte suas redes e publique o que você produziu na LabIA." />
      {params.conectado || params.erro ? (
        <div className="mb-6 grid gap-3">
          {params.conectado ? (
            <Alert variant="success" title="Conta conectada.">
              Você já pode publicar e agendar posts nesta rede.
            </Alert>
          ) : null}
          {params.erro ? <Alert variant="error" title={ERRORS[params.erro] ?? ERRORS.x} /> : null}
        </div>
      ) : null}
      <section aria-labelledby="networks-title" className="mb-10">
        <h2 id="networks-title" className="mb-4 text-body-sm font-medium text-lab-text-dim">
          Redes sociais
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {NETWORKS.map((network) => {
            const found = accounts.find((account) => account.network === network.id);
            const account: CardAccount | null =
              found && found.status !== "DISCONNECTED"
                ? { id: found.id, handle: found.handle, status: found.status, scheduled: counts.get(found.id) ?? 0 }
                : null;
            return (
              <NetworkCard
                key={network.id}
                network={{ id: network.id, label: network.label, backend: network.backend, audience: network.audience, note: network.note }}
                state={networkVisible(network, owner)}
                account={account}
                owner={owner}
                ready={network.backend ? backendReady(network.backend) : false}
              />
            );
          })}
        </div>
      </section>
      <section aria-labelledby="posts-title">
        <h2 id="posts-title" className="mb-4 text-body-sm font-medium text-lab-text-dim">
          Publicações
        </h2>
        <PostList posts={rows} />
      </section>
    </div>
  );
}
