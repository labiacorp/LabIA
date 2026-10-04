import Link from "next/link";
import { notFound } from "next/navigation";
import { CONTENT_STARTERS, scriptText } from "@/lib/content-templates";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { PageHeading } from "@/components/app/page-heading";
import { buttonVariants } from "@/components/ui/button";
import { CreationForm } from "./creation-form";
export default async function NewContentPage({
  searchParams,
}: {
  searchParams: Promise<{
    influencer?: string;
    template?: string;
    starter?: string;
    copy?: string;
  }>;
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
  const params = await searchParams;
  const chosen = params.influencer;
  let initial:
    | { title: string; idea: string; script: string; aspectRatio: string }
    | undefined;
  if (params.template) {
    const item = await prisma.contentTemplate.findFirst({
      where: { id: params.template, userId },
    });
    if (!item) notFound();
    initial = item;
  } else if (params.copy) {
    const item = await prisma.content.findFirst({
      where: { id: params.copy, influencer: { userId } },
      include: {
        steps: { where: { kind: "SCRIPT" }, select: { input: true }, take: 1 },
      },
    });
    if (!item) notFound();
    initial = {
      title: `${item.title.slice(0, 110)} (cópia)`,
      idea: item.idea,
      script: scriptText(item.steps[0]?.input),
      aspectRatio: item.aspectRatio,
    };
  } else if (params.starter) {
    initial = CONTENT_STARTERS.find((item) => item.id === params.starter);
    if (!initial) notFound();
  }
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/conteudos" className="text-body-sm text-lab-text-dim">
        ← Conteúdos
      </Link>
      <PageHeading
        title="Uma nova ideia"
        description="Escolha o personagem e dê uma direção à próxima produção."
        action={
          <Link
            href="/modelos"
            className={buttonVariants({ variant: "secondary", size: "lg" })}
          >
            Explorar modelos
          </Link>
        }
      />
      {characters.length ? (
        <CreationForm
          key={params.template || params.copy || params.starter || "blank"}
          initial={initial}
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
