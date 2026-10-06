import { randomUUID } from "node:crypto";

import { Alert } from "@/components/ui/alert";
import { Badge, stepStatus } from "@/components/ui/badge";
import { CostChip } from "@/components/ui/cost-chip";
import { DEFAULT_SHEET, getSheetOptions, kitSpent, PORTRAIT_ROLES, ROLE_LABEL, sheetItem, stepCost } from "@/lib/character";
import { findImageDefinition, qualityLabel } from "@/lib/providers/image-models";
import { currency } from "@/lib/platform";
import { quote } from "@/lib/generation";
import { cardOf, loadKit, planFor, type KitStep } from "@/lib/kit";
import { getBalanceBrl } from "@/lib/ledger";
import { providerConfigured } from "@/lib/provider";
import { prisma } from "@/lib/prisma";
import { startKit } from "../kit-actions";
import { KitForm } from "./kit-form";
import { KitWatcher } from "./kit-watcher";
import { SheetForm } from "./sheet-form";

function StepBadge({ step }: { step: KitStep }) {
  const [variant, label] = stepStatus[step.status];
  const cost = stepCost(step);
  return (
    <span className="flex items-center gap-2">
      {cost.state === "known" ? <CostChip state="actual" value={cost.brl} size="sm" /> : null}
      {cost.state === "unknown" ? <CostChip state="unavailable" size="sm" /> : null}
      <Badge variant={variant} dot>
        {label}
      </Badge>
    </span>
  );
}

function Failure({ step }: { step: KitStep }) {
  if (step.status !== "FAILED") return null;
  return (
    <Alert variant="error" title="Esta geração falhou">
      {["submission_unknown", "cost_unknown"].includes(step.submissionState)
        ? "O custo precisa de conferência. Nada será reenviado automaticamente."
        : "A geração não foi concluída. Confira o saldo antes de tentar novamente."}
    </Alert>
  );
}

// Which model made this image and the exact prompt it received, so models can be compared.
function Provenance({ step }: { step: KitStep }) {
  const input = step.input as { prompt?: string; resolution?: string } | null;
  if (!step.model || step.status === "PENDING") return null;
  return (
    <details className="text-caption text-lab-text-dim">
      <summary className="cursor-pointer">
        Feita com {findImageDefinition(step.model)?.name ?? step.model}
        {input?.resolution ? ` · ${qualityLabel(input.resolution)}` : ""}
      </summary>
      {input?.prompt ? <p className="mt-2 whitespace-pre-wrap break-words">{input.prompt}</p> : null}
    </details>
  );
}

function Preview({ step, aspect }: { step: KitStep; aspect: string }) {
  const asset = step.assets[0];
  if (step.status === "RUNNING")
    return (
      <div
        className={`lab-placeholder-media flex items-center justify-center rounded-control text-caption text-lab-text-muted ${aspect}`}
      >
        Gerando…
      </div>
    );
  if (!asset) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset.url}
      alt={ROLE_LABEL[step.role!]}
      className={`w-full rounded-control border border-lab-border object-cover ${aspect}`}
    />
  );
}

export async function CharacterTab({
  influencerId,
  userId,
}: {
  influencerId: string;
  userId: string;
}) {
  const influencer = await prisma.influencer.findFirstOrThrow({
    where: { id: influencerId, userId },
  });
  const [kit, balance] = await Promise.all([
    loadKit(influencerId),
    getBalanceBrl(userId),
  ]);
  const card = cardOf(influencer);
  const spent = kitSpent(kit.steps);

  const sheetOptions = getSheetOptions(card);
  const sheetPrompt = String(sheetItem(card).params.prompt);
  const portraitPlan = kit.sheetUrl ? planFor("PORTRAITS", card, kit) : [];
  const portraitQuote = quote(portraitPlan);
  const sheetDone =
    kit.sheet &&
    (kit.sheet.status === "DONE" || kit.sheet.status === "APPROVED");
  const kitReady = PORTRAIT_ROLES.every(
    (role) => kit.portraits[role]?.status === "DONE",
  );
  const short = (total: number) =>
    !providerConfigured()
      ? "A geração ainda precisa ser configurada pela equipe."
      : balance + 1e-9 < total
        ? `Saldo insuficiente: você tem ${currency(balance)} e precisa de ${currency(total)}.`
        : undefined;

  return (
    <div className="grid gap-6">
      <KitWatcher influencerId={influencerId} active={kit.running} />
      {kit.steps.some((step) => stepCost(step).state !== "none") ? (
        <div className="flex flex-wrap items-center gap-2">
          <CostChip
            state={spent.unknown ? "unavailable" : "actual"}
            value={spent.unknown ? undefined : spent.brl}
            prefix="gasto apurado no kit"
          />
        </div>
      ) : null}

      <section className="grid gap-4 rounded-lab border border-lab-border bg-lab-surface-1 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-eyebrow uppercase text-lab-text-muted">
              Passo 1
            </p>
            <h2 className="font-display text-h2">Ficha do personagem</h2>
            <p className="mt-1 max-w-form text-body-sm text-lab-text-dim">
              Uma imagem com tudo: frente, costas, perfil, poses, expressões e
              detalhes. É a referência que mantém o rosto igual em todos os
              conteúdos.
            </p>
          </div>
          {kit.sheet ? <StepBadge step={kit.sheet} /> : null}
        </div>
        {kit.sheet ? <Preview step={kit.sheet} aspect="aspect-[3/2]" /> : null}
        {kit.sheet ? <Provenance step={kit.sheet} /> : null}
        {kit.sheet ? <Failure step={kit.sheet} /> : null}
        {!kit.sheet ||
        kit.sheet.status === "FAILED" ||
        kit.sheet.status === "DONE" ? (
          <SheetForm
            action={startKit.bind(null, influencerId, "SHEET")}
            intent={randomUUID()}
            options={sheetOptions}
            initial={DEFAULT_SHEET}
            prompt={sheetPrompt}
            label={kit.sheet ? "Gerar outra ficha" : "Aprovar e gerar ficha"}
            variant={kit.sheet?.status === "DONE" ? "secondary" : "primary"}
            blockedReason={providerConfigured() ? undefined : "A geração ainda precisa ser configurada pela equipe."}
            balanceBrl={balance}
          />
        ) : null}
      </section>

      <section
        className={`grid gap-4 rounded-lab border border-lab-border bg-lab-surface-1 p-5 ${sheetDone ? "" : "opacity-60"}`}
      >
        <div>
          <p className="font-mono text-eyebrow uppercase text-lab-text-muted">
            Passo 2
          </p>
          <h2 className="font-display text-h2">Retratos</h2>
          <p className="mt-1 max-w-form text-body-sm text-lab-text-dim">
            Frente, perfil e detalhes, gerados a partir da ficha aprovada. Usar
            a ficha para gerar os retratos é o que a aprova.
          </p>
        </div>
        {PORTRAIT_ROLES.some((role) => kit.portraits[role]) ? (
          <div className="grid grid-cols-3 gap-3">
            {PORTRAIT_ROLES.map((role) => {
              const step = kit.portraits[role];
              return (
                <figure key={role} className="grid content-start gap-2">
                  {step ? (
                    <Preview
                      step={step}
                      aspect={
                        role === "DETAIL" ? "aspect-square" : "aspect-[3/4]"
                      }
                    />
                  ) : (
                    <div className="lab-placeholder-media aspect-[3/4] rounded-control" />
                  )}
                  <figcaption className="flex items-center justify-between gap-2 text-caption text-lab-text-dim">
                    {ROLE_LABEL[role]}
                    {step ? <StepBadge step={step} /> : null}
                  </figcaption>
                  {step ? <Failure step={step} /> : null}
                </figure>
              );
            })}
          </div>
        ) : null}
        {sheetDone && portraitPlan.length > 0 ? (
          <KitForm
            action={startKit.bind(null, influencerId, "PORTRAITS")}
            intent={randomUUID()}
            expectedBrl={portraitQuote.totalBrl}
            label={
              portraitPlan.length < PORTRAIT_ROLES.length
                ? "Tentar de novo os que faltam"
                : "Usar esta ficha e gerar retratos"
            }
            blockedReason={short(portraitQuote.totalBrl)}
          />
        ) : null}
        {!sheetDone ? (
          <p className="text-caption text-lab-text-muted">
            Disponível depois que a ficha estiver pronta.
          </p>
        ) : null}
      </section>

      {kitReady ? (
        <Alert variant="success" title="Personagem pronto">
          A ficha e os retratos estão salvos. Agora você já pode criar conteúdos
          com este influencer.
        </Alert>
      ) : null}
    </div>
  );
}
