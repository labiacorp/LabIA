import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { PageHeading } from "@/components/app/page-heading";
import { buttonVariants } from "@/components/ui/button";
import { CreationForm } from "./creation-form";
export default async function NewContentPage({
  searchParams,
}: {
  searchParams: Promise<{ influencer?: string }>;
}) {
  const userId = await requireUserId();
  const characters = await prisma.influencer.findMany({
    where: { userId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const preferences = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { defaultAspectRatio: true },
  });
  const chosen = (await searchParams).influencer;
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/conteudos" className="text-body-sm text-lab-text-dim">
        ← Conteúdos
      </Link>
      <PageHeading
        title="Uma nova ideia"
        description="Escolha o personagem e dê uma direção à próxima produção."
      />
      {characters.length ? (
        <CreationForm
          characters={characters}
          defaultAspectRatio={preferences.defaultAspectRatio}
          selected={
            characters.some((c) => c.id === chosen) ? chosen : undefined
          }
        />
      ) : (
        <div className="rounded-lab border border-lab-border p-6">
          <p className="mb-5">
            Crie seu primeiro personagem para começar uma produção.
          </p>
          <Link href="/?criar=1" className={buttonVariants({ size: "lg" })}>
            Criar personagem
          </Link>
        </div>
      )}
    </div>
  );
}
