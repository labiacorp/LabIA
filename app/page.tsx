import "./landing.css";

import Link from "next/link";
import { redirect } from "next/navigation";

import { BeatSection } from "@/components/landing/beat-section";
import { HeroCanvas } from "@/components/landing/hero-canvas";
import { PublicLanding } from "@/components/landing/public-landing";
import { PainelSection } from "@/components/home/painel-section";
import { Button } from "@/components/ui/button";
import { getSessionPrincipal } from "@/lib/auth/session";
import { hasDatabaseEnv } from "@/lib/db/env";
import { getCurrentMonthGenerationCount, getCurrentMonthSpendBrl, listRecentFlows } from "@/lib/db/flows";
import { listProjects } from "@/lib/projects";

export const dynamic = "force-dynamic";

// A landing cinematográfica original (hero + beats) abre a página para todo mundo.
// Visitante fecha com o convite para entrar; quem tem conta continua no painel logo abaixo.
export default async function Home() {
  const principal = await getSessionPrincipal().catch(() => null);
  if (principal && !principal.workspace) redirect("/sem-acesso");

  const scope = principal?.workspace ? { ownerId: principal.ownerId, workspaceId: principal.workspace.id } : null;
  const [flows, projects, spend, generations] = scope
    ? await Promise.allSettled([
        listRecentFlows(4),
        listProjects(scope),
        hasDatabaseEnv() ? getCurrentMonthSpendBrl(scope.workspaceId) : Promise.reject(new Error("Banco indisponível")),
        hasDatabaseEnv() ? getCurrentMonthGenerationCount(scope.workspaceId) : Promise.reject(new Error("Banco indisponível")),
      ])
    : [];

  return (
    <>
      <HeroCanvas signedIn={Boolean(principal)} />

      {/* Seções Normais pós-hero */}
      <BeatSection beat="b4">
        <p className="font-mono text-xs uppercase tracking-wide text-lab-text-muted">
          Para onde o laboratório caminha
        </p>
        <h2 className="mt-3 font-display text-3xl font-semibold text-lab-text sm:text-4xl">
          Métrica vira aprendizado, aprendizado vira pauta.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-lab-text-dim sm:text-lg">
          É a direção que estamos construindo: o resultado de cada fluxo
          alimentando o próximo, fechando o loop entre o que performou e o
          que ainda vamos produzir.
        </p>
      </BeatSection>

      <BeatSection beat="b5">
        <h2 className="font-display text-3xl font-semibold text-lab-text sm:text-4xl">
          Crie seu primeiro fluxo.
        </h2>
        <p className="mt-4 max-w-xl text-base leading-7 text-lab-text-dim sm:text-lg">
          {principal ? "O painel está logo abaixo, com seus fluxos recentes e o gasto do mês." : "Crie sua conta para começar. Você vê o custo em reais antes de rodar qualquer coisa."}
        </p>
        {principal ? (
          <a
            href="#painel"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-control bg-lab-reagent px-6 font-display text-sm font-semibold text-lab-bg transition-colors hover:bg-lab-reagent-bright"
          >
            Criar seu primeiro fluxo
          </a>
        ) : (
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/criar-conta">Criar conta</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/entrar">Já tenho conta</Link>
            </Button>
          </div>
        )}
      </BeatSection>

      {principal && flows && projects && spend && generations ? (
        <PainelSection
          id="painel"
          name={principal.name}
          flows={flows.status === "fulfilled" ? flows.value : []}
          projects={projects.status === "fulfilled" ? projects.value : []}
          monthSpend={spend.status === "fulfilled" ? spend.value : null}
          generationCount={generations.status === "fulfilled" ? generations.value : null}
          loadError={flows.status === "rejected" || projects.status === "rejected"}
        />
      ) : (
        <PublicLanding />
      )}

      {principal ? (
        <a
          href="#painel"
          className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full border border-lab-border bg-lab-surface-1 px-4 py-2 text-xs font-medium text-lab-text-dim shadow-lg transition-colors hover:border-lab-border-strong hover:text-lab-text"
        >
          Pular para o painel
        </a>
      ) : null}
    </>
  );
}
