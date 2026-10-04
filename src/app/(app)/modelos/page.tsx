import { DeleteTemplate } from "./delete-template";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { CONTENT_STARTERS } from "@/lib/content-templates";
import { PageHeading } from "@/components/app/page-heading";
import { buttonVariants } from "@/components/ui/button";
export default async function TemplatesPage() {
  const userId = await requireUserId();
  const personal = await prisma.contentTemplate.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <div className="mx-auto max-w-content">
      <PageHeading
        title="Comece com uma estrutura"
        description="Modelos de roteiro e briefing para adaptar ao seu personagem. Criar um rascunho é gratuito."
        action={
          <Link
            href="/conteudos/novo"
            className={buttonVariants({ variant: "secondary", size: "lg" })}
          >
            Começar em branco
          </Link>
        }
      />
      {[
        {
          title: "Ideias para começar",
          items: CONTENT_STARTERS,
          personal: false,
        },
        { title: "Meus modelos", items: personal, personal: true },
      ].map((group) => (
        <section key={group.title} className="mb-10">
          <h2 className="mb-4 font-display text-xl">{group.title}</h2>
          {!group.items.length && (
            <p className="rounded-lab border border-lab-border p-6 text-body-sm text-lab-text-dim">
              Abra uma produção e use “Salvar como modelo” para reutilizar seu
              título, briefing e roteiro.
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {group.items.map((item) => (
              <article
                key={item.id}
                className="flex flex-col gap-4 rounded-lab border border-lab-border bg-lab-surface-1 p-5"
              >
                <span className="text-caption text-lab-text-muted">
                  {group.personal ? "Seu modelo" : "Roteiro guiado"} ·{" "}
                  {item.aspectRatio}
                </span>
                <h3 className="font-display text-xl">{item.name}</h3>
                <p className="text-body-sm leading-6 text-lab-text-dim">
                  {item.idea}
                </p>
                <details className="text-body-sm">
                  <summary className="cursor-pointer py-2">Ver roteiro</summary>
                  <p className="mt-2 whitespace-pre-wrap text-lab-text-dim">
                    {item.script || "Este modelo ainda não tem roteiro."}
                  </p>
                </details>
                <Link
                  href={`/conteudos/novo?${group.personal ? "template" : "starter"}=${encodeURIComponent(item.id)}`}
                  className={buttonVariants({
                    size: "lg",
                    className: "mt-auto",
                  })}
                >
                  Usar modelo
                </Link>
                {group.personal && <DeleteTemplate id={item.id} />}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
