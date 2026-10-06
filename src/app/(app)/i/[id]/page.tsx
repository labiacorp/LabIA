import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, stepStatus } from "@/components/ui/badge";
import { ProductionCard } from "@/components/app/production-card";
import { costText } from "@/lib/plan";
import { dateLabel } from "@/lib/platform";
import { PIPELINE } from "@/lib/pipeline";
import { loadKit } from "@/lib/kit";
import { PORTRAIT_ROLES, ROLE_LABEL } from "@/lib/character";
import { ProfileForm } from "./profile-form";
import { LibraryView } from "@/app/(app)/biblioteca/library-view";
import { loadLibrary } from "@/lib/library-data";
import { DEFAULT_LIBRARY_FILTERS } from "@/lib/library";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { CharacterTab } from "./personagem/character-tab";

export const dynamic = "force-dynamic";

const tabs = [
  { key: "conteudos", label: "Conteúdos" },
  { key: "personagem", label: "Personagem" },
  { key: "biblioteca", label: "Biblioteca" },
  { key: "perfil", label: "Identidade" },
] as const;

export default async function InfluencerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  const userId = await requireUserId();
  const { id } = await params;
  const influencer = await prisma.influencer.findFirst({
    where: { id, userId },
  });
  if (!influencer) notFound();
  const references = await prisma.asset.findMany({
    where: {
      userId,
      influencerId: id,
      kind: "IMAGE",
      role: "FRONT",
      step: { status: { in: ["DONE", "APPROVED"] } },
    },
    select: { id: true, url: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  // A new influencer lands on the character tab until it has a face.
  const hasFace = !!influencer.faceAssetId;
  const requestedTab = (await searchParams).aba;
  const aba = tabs.some((tab) => tab.key === requestedTab)
    ? requestedTab
    : hasFace
      ? "conteudos"
      : "personagem";

  const workspace = await loadWorkspace(id, userId, influencer.faceAssetId);
  const locked = PORTRAIT_ROLES.every((role) => workspace.kit.portraits[role]?.status === "DONE");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
    <div className="grid min-w-0 gap-6">
      <div>
        <Link
          href="/influenciadores"
          className="text-body-sm text-lab-text-dim hover:text-lab-text"
        >
          ← Influenciadores
        </Link>
        <div className="mt-3 flex items-center gap-4">
          {workspace.face ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={workspace.face} alt="" className="size-16 shrink-0 rounded-full border border-lab-border object-cover md:size-20" />
          ) : (
            <div className="lab-placeholder-media size-16 shrink-0 rounded-full md:size-20" />
          )}
          <div className="min-w-0">
            <h1 className="break-words font-display text-h1 leading-none">{influencer.name}</h1>
            <p className="mt-1 text-body-sm text-lab-text-dim">{influencer.niche} · {influencer.tone}</p>
            <span className={`mt-2 inline-flex h-6 items-center rounded-full border px-2.5 font-mono text-caption ${locked ? "border-lab-reagent text-lab-reagent-bright" : "border-lab-border-strong text-lab-text-dim"}`}>
              {locked ? `rosto travado · ${PORTRAIT_ROLES.length} retratos` : "rosto ainda não criado"}
            </span>
          </div>
        </div>
      </div>
      {workspace.media.length ? (
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Mídias recentes">
          {workspace.media.map((asset) => (
            <Link key={asset.id} href={`/i/${id}?aba=biblioteca`} className="shrink-0">
              {asset.kind === "VIDEO" ? (
                <video src={asset.url} muted preload="metadata" className="h-24 w-16 rounded-control border border-lab-border object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset.url} alt="" className="h-24 w-16 rounded-control border border-lab-border object-cover" />
              )}
            </Link>
          ))}
        </div>
      ) : null}
      <nav aria-label="Seções do influencer" className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/i/${id}?aba=${tab.key}`}
            aria-current={aba === tab.key ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center rounded-control px-3 text-body-sm font-medium transition-colors ${aba === tab.key ? "bg-lab-surface-2 text-lab-text" : "text-lab-text-dim hover:bg-lab-surface-2 hover:text-lab-text"}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {aba === "personagem" ? (
        <CharacterTab influencerId={id} userId={userId} />
      ) : aba === "biblioteca" ? (
        <Library influencerId={id} userId={userId} />
      ) : aba === "perfil" ? (
        <ProfileForm
          influencer={influencer}
          references={references.map((asset) => ({
            id: asset.id,
            url: asset.url,
            label: `Retrato de ${asset.createdAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
          }))}
        />
      ) : (
        <Contents influencerId={id} name={influencer.name} />
      )}
    </div>
    <Workspace id={id} workspace={workspace} />
    </div>
  );
}

// Everything the side panel and header need, in one place (a plain function, so "30 days ago" is not computed in render).
async function loadWorkspace(influencerId: string, userId: string, faceAssetId: string | null) {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [kit, face, media, runs, spend] = await Promise.all([
    loadKit(influencerId),
    faceAssetId ? prisma.asset.findFirst({ where: { id: faceAssetId, userId }, select: { url: true } }) : null,
    prisma.asset.findMany({ where: { userId, influencerId, kind: { in: ["IMAGE", "VIDEO"] } }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, url: true, kind: true } }),
    prisma.step.findMany({
      where: { OR: [{ influencerId }, { content: { influencerId } }], kind: { not: "SCRIPT" }, status: { not: "PENDING" } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, kind: true, role: true, status: true, createdAt: true, actualCostBrl: true, estimatedCostBrl: true, contentId: true, content: { select: { title: true } } },
    }),
    prisma.ledgerEntry.aggregate({ where: { userId, createdAt: { gte: since }, reason: { in: ["SPEND", "REFUND"] }, step: { OR: [{ influencerId }, { content: { influencerId } }] } }, _sum: { deltaBrl: true } }),
  ]);
  return { kit, face: face?.url ?? null, media, runs, spentBrl: -Number(spend._sum.deltaBrl ?? 0) };
}

function Workspace({ id, workspace }: { id: string; workspace: Awaited<ReturnType<typeof loadWorkspace>> }) {
  const panel = "rounded-card bg-lab-surface-1 p-4 shadow-[inset_0_0_0_1px_var(--lab-border)]";
  return (
    <aside className="grid min-w-0 grid-cols-1 gap-3 lg:sticky lg:top-20">
      <section className={panel}>
        <p className="font-mono text-caption text-lab-text-muted">gasto em 30 dias</p>
        <p className="mt-1 font-mono text-h3 text-lab-reagent-bright">{costText(Math.max(0, workspace.spentBrl))}</p>
      </section>
      <section className={panel}>
        <h2 className="text-body-sm font-semibold">Execuções</h2>
        {workspace.runs.length ? (
          <ol className="mt-3 grid gap-2.5">
            {workspace.runs.map((run) => {
              const [variant, label] = run.status === "DONE" || run.status === "APPROVED" ? (["ready", "Pronto"] as const) : stepStatus[run.status];
              const cost = run.actualCostBrl ?? run.estimatedCostBrl;
              const title = run.kind === "CHARACTER" ? ROLE_LABEL[run.role ?? "SHEET"] : `${PIPELINE.find((item) => item.kind === run.kind)?.title ?? "Etapa"} · ${run.content?.title ?? ""}`;
              return (
                <li key={run.id}>
                  <Link href={run.contentId ? `/i/${id}/c/${run.contentId}#step-${run.id}` : `/i/${id}?aba=personagem`} className="grid grid-cols-1 gap-1 rounded-control p-1.5 hover:bg-lab-surface-2">
                    <span className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-body-sm">{title}</span>
                      <Badge variant={variant} dot>{label}</Badge>
                    </span>
                    <span className="font-mono text-caption text-lab-text-muted">{dateLabel(run.createdAt)}{cost !== null ? ` · ${costText(Number(cost))}` : ""}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-2 text-caption text-lab-text-dim">Nada gerado ainda. Cada geração aparece aqui com o tempo e os créditos.</p>
        )}
      </section>
      <section className={panel}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-body-sm font-semibold">Identidade</h2>
          <Link href={`/i/${id}?aba=personagem`} className="text-caption underline">Ver</Link>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {PORTRAIT_ROLES.map((role) => {
            const url = workspace.kit.portraits[role]?.assets[0]?.url;
            return url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={role} src={url} alt={ROLE_LABEL[role]} className="aspect-[3/4] w-full rounded-control object-cover" />
            ) : (
              <div key={role} className="lab-placeholder-media aspect-[3/4] rounded-control" />
            );
          })}
        </div>
      </section>
    </aside>
  );
}

async function Contents({ influencerId, name }: { influencerId: string; name: string }) {
  const contents = await prisma.content.findMany({
    where: { influencerId, archivedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 24,
    include: { assets: { where: { kind: "IMAGE" }, orderBy: { createdAt: "desc" }, take: 1, select: { url: true } } },
  });
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/conteudos/novo?influencer=${influencerId}`} className={buttonVariants({ size: "lg" })}>
          Criar conteúdo
        </Link>
        {contents.length ? <Link href={`/conteudos?influencer=${influencerId}`} className="text-body-sm underline">Ver todos</Link> : null}
      </div>
      {contents.length === 0 ? (
        <p className="text-body-sm text-lab-text-dim">Nenhum conteúdo ainda. Crie o primeiro: o rascunho é grátis.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {contents.map((content) => (
            <ProductionCard key={content.id} id={content.id} influencerId={influencerId} title={content.title} influencerName={name} status={content.status} updatedAt={content.updatedAt} preview={content.assets[0]?.url} />
          ))}
        </div>
      )}
    </div>
  );
}

async function Library({
  influencerId,
  userId,
}: {
  influencerId: string;
  userId: string;
}) {
  const filters = { ...DEFAULT_LIBRARY_FILTERS, influencer: influencerId };
  const data = await loadLibrary(userId, filters);
  return <LibraryView {...data} filters={filters} />;
}
