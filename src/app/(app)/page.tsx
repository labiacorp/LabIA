import Link from "next/link";
import { Plus, UserRound } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const userId = await requireUserId();
  const influencers = await prisma.influencer.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { contents: true } } },
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-h1">Influencers</h1>
          <p className="mt-1.5 text-body-sm text-lab-text-dim">Cada influencer tem rosto, nicho e tom próprios. Todo conteúdo nasce dentro de um.</p>
        </div>
        <Link href="/influencers/new" className={buttonVariants({ className: "self-start whitespace-nowrap" })}><Plus />Novo influencer</Link>
      </div>
      {influencers.length === 0 ? (
        <EmptyState icon={UserRound} title="Nenhum influencer ainda" description="Comece definindo quem ele é: nome, nicho e tom de voz. Depois você cria os conteúdos dele." action={<Link href="/influencers/new" className={buttonVariants()}>Criar meu primeiro influencer</Link>} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {influencers.map((influencer) => (
            <li key={influencer.id}>
              <Link href={`/i/${influencer.id}`} className="block rounded-lab border border-lab-border bg-lab-surface-1 p-5 transition-colors duration-micro ease-lab hover:border-lab-border-strong focus-visible:outline-none focus-visible:shadow-lab-focus">
                <p className="font-display text-h3">{influencer.name}</p>
                <p className="mt-1 text-body-sm text-lab-text-dim">{influencer.niche}</p>
                <p className="mt-4 font-mono text-eyebrow uppercase text-lab-text-muted">{influencer._count.contents} {influencer._count.contents === 1 ? "conteúdo" : "conteúdos"}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
