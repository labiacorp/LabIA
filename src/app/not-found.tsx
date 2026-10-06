import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-[60vh] max-w-lg content-center gap-5 px-5 py-12">
      <p className="lp-eyebrow">404 · LABIA</p>
      <h1 className="font-display text-[clamp(44px,10vw,64px)] leading-[.9]">Página não encontrada</h1>
      <p className="text-body leading-6 text-lab-text-dim">
        O endereço pode ter mudado ou este conteúdo não está disponível para sua
        conta.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/painel" className={buttonVariants({ size: "lg" })}>
          Voltar ao painel
        </Link>
        <Link
          href="/conteudos"
          className={buttonVariants({ variant: "secondary", size: "lg" })}
        >
          Ver meus conteúdos
        </Link>
      </div>
    </div>
  );
}
