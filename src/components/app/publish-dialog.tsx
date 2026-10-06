"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { getPublishTargets, publishAction, type PublishTargets } from "@/app/(app)/integracoes/publish-actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { CostChip } from "@/components/ui/cost-chip";
import { Textarea } from "@/components/ui/field";
import { NETWORKS, textLength } from "@/lib/social/networks";
import { hasUrl, quotePost } from "@/lib/social/pricing";

const MIN_LEAD_MS = 5 * 60_000;
const MAX_LEAD_MS = 30 * 24 * 60 * 60_000;
// America/Sao_Paulo is UTC-03:00 all year (no DST since 2019), independent of the browser's zone.
const SAO_PAULO_OFFSET_MS = -3 * 60 * 60_000;

// The wall-clock string a datetime-local input uses, for an instant seen from Sao Paulo.
function toLocalInput(ms: number): string {
  return new Date(ms + SAO_PAULO_OFFSET_MS).toISOString().slice(0, 16);
}

// A datetime-local value ("YYYY-MM-DDTHH:mm") read as Sao Paulo time, as an ISO string with the offset.
export function saoPauloIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const iso = `${value}:00-03:00`;
  return Number.isNaN(new Date(iso).getTime()) ? null : iso;
}

function leadOk(iso: string): boolean {
  const lead = new Date(iso).getTime() - Date.now();
  return lead >= MIN_LEAD_MS && lead <= MAX_LEAD_MS;
}

const round4 = (n: number) => Math.round(n * 10_000) / 10_000;

function PublishForm({ assetId, contentId }: { assetId: string; contentId: string | null }) {
  const [intentId] = useState(() => crypto.randomUUID());
  const [targets, setTargets] = useState<PublishTargets | { error: string } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [aiLabel, setAiLabel] = useState(true);
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [when, setWhen] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<"" | "now" | "schedule">("");
  const [bounds] = useState(() => {
    const now = Date.now();
    return { min: toLocalInput(now + MIN_LEAD_MS), max: toLocalInput(now + MAX_LEAD_MS) };
  });

  useEffect(() => {
    let live = true;
    getPublishTargets(assetId)
      .then((result) => live && setTargets(result))
      .catch(() => live && setTargets({ error: "Não foi possível carregar suas contas. Tente novamente." }));
    return () => {
      live = false;
    };
  }, [assetId]);

  if (!targets) return <p className="p-5 text-body-sm text-lab-text-dim">Carregando suas contas…</p>;
  if ("error" in targets) return <p role="alert" className="p-5 text-body-sm text-lab-danger">{targets.error}</p>;

  const chosen = targets.accounts.filter((account) => selected.includes(account.id));
  const quotes = chosen.map((account) => ({ account, brl: quotePost(account.network, text, targets.usdBrlRate).brl }));
  const total = round4(quotes.reduce((sum, item) => sum + item.brl, 0));
  const overLimit = chosen.some((account) => textLength(account.network, text) > NETWORKS.find((n) => n.id === account.network)!.maxText);
  const scheduledIso = mode === "schedule" ? saoPauloIso(when) : null;
  const scheduleOk = mode === "now" || scheduledIso !== null;
  const valid = chosen.length > 0 && text.trim().length > 0 && !overLimit && scheduleOk;
  const xLink = chosen.some((account) => account.network === "X") && hasUrl(text);
  const xLinkBrl = round4(quotePost("X", "https://x.com", targets.usdBrlRate).brl);

  async function submit() {
    if (!valid || pending || done) return;
    if (scheduledIso) {
      if (!leadOk(scheduledIso)) {
        setError("Escolha um horário entre 5 minutos e 30 dias à frente.");
        return;
      }
    }
    setPending(true);
    setError("");
    try {
      const result = await publishAction({
        intentId,
        assetId,
        contentId,
        accountIds: selected,
        text,
        aiLabel,
        scheduledAt: scheduledIso,
        expectedBrl: total,
      });
      if ("error" in result) setError(result.error);
      else setDone(mode);
    } catch {
      setError("Não foi possível publicar agora. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  if (done)
    return (
      <div className="studio-dialog-details" role="status">
        <p className="font-medium">{done === "schedule" ? "Publicação agendada." : "Publicação enviada."}</p>
        <Link href="/integracoes" className={buttonVariants({ variant: "secondary", size: "lg" })}>
          Ver em Integrações
        </Link>
      </div>
    );

  return (
    <form
      className="studio-dialog-details"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-body-sm font-medium">Contas</legend>
        {targets.accounts.length ? (
          targets.accounts.map((account) => {
            const info = NETWORKS.find((n) => n.id === account.network)!;
            const quote = quotes.find((item) => item.account.id === account.id);
            return (
              <label key={account.id} className="flex min-h-11 items-center gap-3 rounded-control border border-lab-border px-3">
                <input
                  type="checkbox"
                  className="size-5"
                  checked={selected.includes(account.id)}
                  onChange={(event) =>
                    setSelected((current) => (event.target.checked ? [...current, account.id] : current.filter((id) => id !== account.id)))
                  }
                />
                <span className="min-w-0 flex-1 break-words text-body-sm">
                  {info.label} · @{account.handle}
                </span>
                {quote ? <CostChip state={quote.brl > 0 ? "estimated" : "free"} value={quote.brl} /> : null}
              </label>
            );
          })
        ) : (
          <p className="text-body-sm text-lab-text-dim">
            Você ainda não tem uma conta conectada que aceite este arquivo.{" "}
            <Link href="/integracoes" className="underline underline-offset-4">
              Conectar uma rede
            </Link>
          </p>
        )}
      </fieldset>

      <div className="grid gap-2">
        <label htmlFor="publish-text" className="text-body-sm font-medium">
          Texto da publicação
        </label>
        <Textarea
          id="publish-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={4}
          className="font-sans text-body-sm"
          placeholder="Escreva o que acompanha o arquivo"
        />
        {chosen.length ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-caption">
            {chosen.map((account) => {
              const info = NETWORKS.find((n) => n.id === account.network)!;
              const length = textLength(account.network, text);
              return (
                <li key={account.id} className={length > info.maxText ? "text-lab-danger" : "text-lab-text-dim"}>
                  {info.label}: {length}/{info.maxText}
                </li>
              );
            })}
          </ul>
        ) : null}
        {xLink ? (
          <p className="text-caption text-lab-text-dim">
            Posts com link no X custam mais: ~{xLinkBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        ) : null}
      </div>

      <label className="flex min-h-11 items-start gap-3">
        <input type="checkbox" role="switch" className="mt-1 size-5" checked={aiLabel} onChange={(event) => setAiLabel(event.target.checked)} />
        <span className="grid text-body-sm">
          Marcar como conteúdo gerado por IA
          <span className="text-caption text-lab-text-dim">As redes pedem esse aviso em conteúdo realista feito com IA.</span>
        </span>
      </label>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-body-sm font-medium">Quando publicar</legend>
        <label className="flex min-h-11 items-center gap-3">
          <input type="radio" name="publish-mode" className="size-5" checked={mode === "now"} onChange={() => setMode("now")} />
          <span className="text-body-sm">Publicar agora</span>
        </label>
        <label className="flex min-h-11 items-center gap-3">
          <input type="radio" name="publish-mode" className="size-5" checked={mode === "schedule"} onChange={() => setMode("schedule")} />
          <span className="text-body-sm">Agendar</span>
        </label>
        {mode === "schedule" ? (
          <label className="grid gap-1 text-caption text-lab-text-dim">
            Data e hora (horário de Brasília)
            <input
              type="datetime-local"
              value={when}
              min={bounds.min}
              max={bounds.max}
              onChange={(event) => setWhen(event.target.value)}
              className="h-11 rounded-control border border-lab-border bg-lab-surface-2 px-3 text-body-sm text-lab-text"
            />
          </label>
        ) : null}
      </fieldset>

      <div className="flex items-center justify-between gap-3 border-t border-lab-border pt-3">
        <span className="text-body-sm text-lab-text-dim">Custo total</span>
        <CostChip state={total > 0 ? "estimated" : "free"} value={total} size="lg" />
      </div>

      {error ? (
        <p role="alert" className="text-body-sm text-lab-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" loading={pending} disabled={!valid}>
        {mode === "schedule" ? "Agendar publicação" : "Publicar"}
      </Button>
    </form>
  );
}

export function PublishButton({ assetId, contentId }: { assetId: string; contentId?: string | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        size="lg"
        variant="ghost"
        onClick={() => {
          setOpen(true);
          dialog.current?.showModal();
        }}
      >
        <Send className="size-4" />
        Publicar
      </Button>
      <dialog
        ref={dialog}
        className="studio-dialog publish-dialog"
        aria-labelledby={`publish-title-${assetId}`}
        onClose={() => setOpen(false)}
      >
        <div className="studio-dialog-header">
          <h2 id={`publish-title-${assetId}`} className="font-display text-lg">
            Publicar
          </h2>
          <button type="button" aria-label="Fechar publicação" className="lab-hit-target shrink-0" onClick={() => dialog.current?.close()}>
            <X className="mx-auto size-5" />
          </button>
        </div>
        {open ? <PublishForm assetId={assetId} contentId={contentId ?? null} /> : null}
      </dialog>
    </>
  );
}
