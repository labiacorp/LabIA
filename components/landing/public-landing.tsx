import Link from "next/link";

import { Button } from "@/components/ui/button";

export function PublicLanding() {
  return (
    <main id="painel" className="relative flex min-h-[calc(100svh-56px)] flex-1 items-end overflow-hidden bg-lab-bg px-5 pb-10 pt-20 md:px-16 md:pb-[120px] lg:px-24">
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(135deg, color-mix(in srgb, var(--lab-surface-1) 50%, var(--lab-bg)) 0 10px, var(--lab-bg) 10px 20px)" }} />
      <div className="relative flex w-full max-w-[640px] flex-col gap-4 md:gap-6">
        <p className="hidden font-mono text-eyebrow uppercase tracking-[0.1em] text-lab-text-dim md:block">Produção de conteúdo com IA · pague por uso</p>
        <h1 className="text-balance font-display text-[40px] font-bold leading-[42px] tracking-[-0.03em] md:text-[72px] md:leading-[72px] md:tracking-[-0.035em]">Imagem e vídeo com o custo na cara.</h1>
        <p className="max-w-[520px] text-[15px] leading-[23px] text-lab-text-dim md:text-lg md:leading-7"><span className="md:hidden">Veja quanto custa em reais antes de rodar.</span><span className="hidden md:inline">Monte o fluxo, veja quanto custa em reais antes de rodar e quanto custou depois. Sem crédito opaco, sem plano caro.</span></p>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Button asChild size="lg" className="h-12 px-5 text-[15px]"><Link href="/criar-conta">Criar conta</Link></Button>
          <Button asChild variant="secondary" size="lg" className="h-12 px-5 text-[15px]"><Link href="/entrar">Já tenho conta</Link></Button>
        </div>
      </div>
    </main>
  );
}
