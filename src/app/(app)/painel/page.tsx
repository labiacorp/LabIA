import Link from "next/link";
import { ArrowUpRight, Film, Users, ImageIcon, Sparkles } from "lucide-react";
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
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-3 text-caption uppercase tracking-widest text-lab-text-muted">Seu espaço de criação</p><h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Ideias em movimento.</h1><p className="mt-3 text-body-sm text-lab-text-dim">Do primeiro personagem ao próximo vídeo. Tudo no seu laboratório.</p></div><Link href="/conteudos/novo" className={buttonVariants({variant:"secondary"})}>Nova produção <ArrowUpRight className="size-4" /></Link></div>
      <section className="dashboard-hero mb-6 grid gap-6 rounded-lab border border-lab-border-strong p-6 md:grid-cols-[1fr_auto] md:p-10">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-control border border-lab-border bg-lab-surface-2 px-3 py-1 text-caption text-lab-text-dim">
            <Sparkles className="size-4" />
            COMECE POR AQUI
          </div>
          <h2 className="max-w-lg font-display text-3xl font-semibold leading-tight md:text-4xl">
            Dê identidade à sua próxima ideia.
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
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
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
      <div className="mb-9 grid gap-3 md:grid-cols-2">
        <Link href="/trends" className="dashboard-shortcut"><span className="shell-option-icon"><Sparkles className="size-5" /></span><span className="flex-1"><span className="block font-medium">Um movimento. Seus personagens.</span><span className="mt-1 block text-body-sm text-lab-text-dim">Prepare referências e recrie um vídeo em Trends.</span></span><ArrowUpRight className="size-5 shrink-0" /></Link>
        <Link href="/modelos" className="dashboard-shortcut"><span className="shell-option-icon"><Film className="size-5" /></span><span className="flex-1"><span className="block font-medium">Não comece do zero.</span><span className="mt-1 block text-body-sm text-lab-text-dim">Escolha um modelo e adapte ao seu próximo conteúdo.</span></span><ArrowUpRight className="size-5 shrink-0" /></Link>
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
