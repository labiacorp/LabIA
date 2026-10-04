import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, contentStatus } from "@/components/ui/badge";
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
  { key: "perfil", label: "Perfil" },
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

  return (
    <div className="grid gap-6">
      <div>
        <Link
          href="/influenciadores"
          className="text-body-sm text-lab-text-dim hover:text-lab-text"
        >
          ← Influenciadores
        </Link>
        <h1 className="mt-2 font-display text-h1">{influencer.name}</h1>
        <p className="mt-1 text-body-sm text-lab-text-dim">
          {influencer.niche} · {influencer.tone}
        </p>
      </div>
      <nav aria-label="Seções do influencer" className="flex flex-wrap gap-1">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/i/${id}?aba=${tab.key}`}
            aria-current={aba === tab.key ? "page" : undefined}
            className={`flex h-8 items-center rounded-control px-3 text-body-sm font-medium transition-colors ${aba === tab.key ? "bg-lab-surface-2 text-lab-text" : "text-lab-text-dim hover:bg-lab-surface-2 hover:text-lab-text"}`}
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
            label: `Retrato de ${asset.createdAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} · ${asset.id.slice(-5)}`,
          }))}
        />
      ) : (
        <Contents influencerId={id} />
      )}
    </div>
  );
}

async function Contents({ influencerId }: { influencerId: string }) {
  const contents = await prisma.content.findMany({
    where: { influencerId, archivedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 24,
  });
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/conteudos/novo?influencer=${influencerId}`}
          className={buttonVariants({ size: "lg" })}
        >
          Criar conteúdo
        </Link>
        <Link
          href={`/conteudos?influencer=${influencerId}`}
          className="text-body-sm underline"
        >
          Ver todos os conteúdos
        </Link>
      </div>
      {contents.length === 0 ? (
        <p className="text-body-sm text-lab-text-dim">Nenhum conteúdo ainda.</p>
      ) : (
        <ul className="grid gap-2">
          {contents.map((content) => {
            const [variant, label] = contentStatus[content.status];
            return (
              <li key={content.id}>
                <Link
                  href={`/i/${influencerId}/c/${content.id}`}
                  className="flex items-center justify-between gap-4 rounded-lab border border-lab-border bg-lab-surface-1 px-5 py-4 transition-colors duration-micro ease-lab hover:border-lab-border-strong focus-visible:outline-none focus-visible:shadow-lab-focus"
                >
                  <span className="font-medium">{content.title}</span>
                  <Badge variant={variant} dot>
                    {label}
                  </Badge>
                </Link>
              </li>
            );
          })}
        </ul>
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
