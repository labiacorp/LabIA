"use client";

import { useRef, useState, useTransition } from "react";
import {
  AtSign,
  Briefcase,
  Camera,
  CircleCheck,
  Cloud,
  Link2,
  Music2,
  Play,
  ThumbsUp,
  TriangleAlert,
  X as CloseIcon,
  type LucideIcon,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NetworkId } from "@/lib/social/networks";
import { disconnectAction } from "./actions";

export type CardNetwork = { id: NetworkId; label: string; backend: "x" | "bundle" | null; note?: string };
export type CardAccount = { id: string; handle: string; status: "CONNECTED" | "EXPIRED" | "ERROR"; scheduled: number };

const NAMES: Record<NetworkId, string> = {
  X: "X (Twitter)",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  LINKEDIN: "LinkedIn",
  THREADS: "Threads",
  YOUTUBE: "YouTube",
  FACEBOOK: "Facebook",
  BLUESKY: "Bluesky",
};
const GLYPHS: Partial<Record<NetworkId, LucideIcon>> = {
  INSTAGRAM: Camera,
  TIKTOK: Music2,
  LINKEDIN: Briefcase,
  THREADS: AtSign,
  YOUTUBE: Play,
  FACEBOOK: ThumbsUp,
  BLUESKY: Cloud,
};

export function NetworkLogo({ id, className }: { id: NetworkId; className?: string }) {
  const tile =
    id === "X"
      ? "bg-lab-text text-lab-bg"
      : id === "LINKEDIN"
        ? "bg-lab-reagent text-lab-on-reagent"
        : "bg-lab-surface-2 text-lab-text";
  const Glyph = GLYPHS[id];
  return (
    <span aria-hidden className={cn("flex size-12 shrink-0 items-center justify-center rounded-control", tile, className)}>
      {id === "X" ? (
        <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ) : Glyph ? (
        <Glyph className="size-5" />
      ) : null}
    </span>
  );
}

const pill = "inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-caption font-medium";

export function NetworkCard({
  network,
  state,
  account,
  owner,
  ready,
}: {
  network: CardNetwork;
  state: "active" | "soon";
  account: CardAccount | null;
  owner: boolean;
  ready: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const name = NAMES[network.id];
  const href = network.backend ? `/api/integrations/${network.backend}/start` : "#";
  const connected = account?.status === "CONNECTED";
  const soon = state === "soon";
  const notConfigured = !soon && !ready;

  let status: React.ReactNode = null;
  if (soon) status = <span className={cn(pill, "border-lab-border bg-lab-surface-2 text-lab-text-dim")}>Em breve</span>;
  else if (notConfigured)
    status = <span className={cn(pill, "border-lab-warning-line bg-lab-warning-dim text-lab-warning")}>Configuração pendente</span>;
  else if (connected)
    status = (
      <span className={cn(pill, "border-lab-success/30 bg-lab-success-dim text-lab-success")}>
        <CircleCheck className="size-3.5" aria-hidden />
        Conectado
      </span>
    );
  else if (account?.status === "EXPIRED")
    status = (
      <span className={cn(pill, "border-lab-warning-line bg-lab-warning-dim text-lab-warning")}>
        <TriangleAlert className="size-3.5" aria-hidden />
        Expirada
      </span>
    );
  else if (account?.status === "ERROR")
    status = (
      <span className={cn(pill, "border-lab-danger-line bg-lab-danger-dim text-lab-danger")}>
        <TriangleAlert className="size-3.5" aria-hidden />
        Erro
      </span>
    );

  const linkClass = (primary: boolean) =>
    cn(buttonVariants({ variant: primary ? "primary" : "secondary", size: "lg" }), "w-full");

  function openDialog() {
    setError("");
    dialog.current?.showModal();
  }

  function confirm() {
    if (!account) return;
    setError("");
    start(async () => {
      const result = await disconnectAction(account.id);
      if ("error" in result) setError(result.error);
      else dialog.current?.close();
    });
  }

  const unlink = (
    <button type="button" className="lab-hit-target text-body-sm font-medium text-lab-danger hover:underline" onClick={openDialog}>
      Desvincular
    </button>
  );

  return (
    <article
      data-network={network.id}
      data-state={soon ? "soon" : notConfigured ? "pending" : (account?.status ?? "none")}
      className="flex flex-col gap-4 rounded-lab border border-lab-border bg-lab-surface-1 p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <NetworkLogo id={network.id} />
        {status}
      </div>
      <div className="min-w-0">
        <h3 className="flex flex-wrap items-center gap-2 font-display text-lg font-semibold">
          {name}
          {!soon && owner && network.backend === "bundle" ? (
            <span className="rounded-full border border-dashed border-lab-border-strong px-2 text-caption font-normal text-lab-text-dim">
              Teste interno
            </span>
          ) : null}
        </h3>
        <p className="mt-1 text-body-sm text-lab-text-dim">
          {soon
            ? "Chega em breve."
            : connected
              ? `Conectado como @${account!.handle}`
              : account?.status === "EXPIRED"
                ? `Reconecte sua conta @${account.handle}`
                : account?.status === "ERROR"
                  ? "Erro na conexão. Reconecte para continuar."
                  : (network.note ?? `Publique e agende posts no ${network.label}.`)}
        </p>
      </div>
      <div className="mt-auto grid gap-2">
        {soon || notConfigured ? null : connected ? (
          <>
            <a href={href} className={linkClass(false)}>
              <Link2 aria-hidden />
              Reconectar conta do {network.label}
            </a>
            {unlink}
          </>
        ) : account ? (
          <>
            <a href={href} className={linkClass(true)}>
              <Link2 aria-hidden />
              Reconectar
            </a>
            {unlink}
          </>
        ) : (
          <a href={href} className={linkClass(true)}>
            <Link2 aria-hidden />
            Conectar {network.label}
          </a>
        )}
      </div>
      {account ? (
        <dialog ref={dialog} className="studio-dialog" aria-labelledby={`unlink-${network.id}`}>
          <div className="studio-dialog-header">
            <h2 id={`unlink-${network.id}`} className="font-display text-lg">
              Desvincular {name}?
            </h2>
            <button type="button" aria-label="Fechar" className="lab-hit-target shrink-0" onClick={() => dialog.current?.close()}>
              <CloseIcon className="mx-auto size-5" />
            </button>
          </div>
          <div className="studio-dialog-details">
            <p className="text-body-sm leading-6">
              A conta @{account.handle} será desvinculada da LabIA.{" "}
              {account.scheduled > 0
                ? `${account.scheduled} ${account.scheduled === 1 ? "publicação agendada será cancelada e reembolsada" : "publicações agendadas serão canceladas e reembolsadas"}.`
                : "Você não tem publicações agendadas nesta conta."}
            </p>
            {error ? (
              <p role="alert" className="text-body-sm text-lab-danger">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={buttonVariants({ variant: "secondary", size: "lg" })} onClick={() => dialog.current?.close()}>
                Voltar
              </button>
              <button type="button" disabled={pending} className={buttonVariants({ variant: "danger", size: "lg" })} onClick={confirm}>
                {pending ? "Desvinculando…" : "Desvincular"}
              </button>
            </div>
          </div>
        </dialog>
      ) : null}
    </article>
  );
}
