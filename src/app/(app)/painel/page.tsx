import Link from "next/link";
import { ArrowUpRight, Film, Users, ImageIcon, Sparkles } from "lucide-react";
import { PageHeading } from "@/components/app/page-heading";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { contentStatusLabels, dateLabel } from "@/lib/platform";

export default async function DashboardPage() {
  const userId = await requireUserId();
  const [influencers, contents, assets, recent] = await Promise.all([
    prisma.influencer.count({ where: { userId } }),
    prisma.content.count({
      where: { influencer: { userId }, archivedAt: null },
    }),
    prisma.asset.count({ where: { userId } }),
    prisma.content.findMany({
      where: { influencer: { userId }, archivedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { influencer: { select: { name: true } } },
    }),
  ]);
  return (
    <div className="mx-auto max-w-content">
      <PageHeading
        title="Seu próximo conteúdo começa aqui"
        description="Crie personagens, acompanhe a produção e encontre o que você já fez."
      />
      <section className="mb-6 grid gap-6 rounded-lab border border-lab-border-strong bg-lab-surface-1 p-6 md:grid-cols-[1fr_auto] md:p-8">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-control border border-lab-border bg-lab-surface-2 px-3 py-1 text-caption text-lab-text-dim">
            <Sparkles className="size-4" />
            Ferramenta principal
          </div>
          <h2 className="font-display text-2xl font-semibold">
            Estúdio de influencers
          </h2>
          <p className="mt-3 max-w-xl text-body-sm leading-6 text-lab-text-dim">
            Defina a aparência do seu personagem, monte seu kit de referências e
            transforme ideias em vídeos.
          </p>
        </div>
        <div className="flex items-center">
          <Link href="/" className={buttonVariants({ size: "lg" })}>
            Abrir estúdio <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </section>
      <div className="mb-9 grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Influenciadores",
            value: influencers,
            icon: Users,
            href: "/influenciadores",
          },
          {
            label: "Conteúdos",
            value: contents,
            icon: Film,
            href: "/conteudos",
          },
          {
            label: "Arquivos criados",
            value: assets,
            icon: ImageIcon,
            href: "/biblioteca",
          },
        ].map(({ label, value, icon: Icon, href }) => (
          <Link
            href={href}
            key={label}
            className="rounded-lab border border-lab-border bg-lab-surface-1 p-5 transition-colors hover:border-lab-border-strong"
          >
            <div className="flex items-center justify-between text-body-sm text-lab-text-dim">
              {label}
              <Icon className="size-4" />
            </div>
            <p className="mt-4 font-display text-3xl">{value}</p>
            {label === "Arquivos criados" ? (
              <p className="mt-2 text-caption text-lab-text-muted">
                Abrir biblioteca de arquivos
              </p>
            ) : null}
          </Link>
        ))}
      </div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl">Continue de onde parou</h2>
        <Link
          href="/conteudos"
          className="text-body-sm text-lab-text-dim hover:underline"
        >
          Ver todos
        </Link>
      </div>
      {recent.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {recent.map((content) => (
            <Link
              key={content.id}
              href={`/i/${content.influencerId}/c/${content.id}`}
              className="rounded-lab border border-lab-border bg-lab-surface-1 p-5 hover:border-lab-border-strong"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-caption text-lab-text-muted">
                  {content.influencer.name}
                </span>
                <span className="rounded-control bg-lab-surface-2 px-2 py-1 text-caption">
                  {contentStatusLabels[content.status]}
                </span>
              </div>
              <h3 className="mt-4 break-words font-display text-lg font-medium">
                {content.title}
              </h3>
              <p className="mt-3 text-caption text-lab-text-dim">
                Atualizado em {dateLabel(content.updatedAt)}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Sua primeira produção"
          description="Comece criando um influenciador no estúdio. Os conteúdos em produção aparecerão aqui para você continuar."
          action={
            <Link href="/?criar=1" className={buttonVariants({ size: "lg" })}>
              Criar influenciador
            </Link>
          }
        />
      )}
    </div>
  );
}
