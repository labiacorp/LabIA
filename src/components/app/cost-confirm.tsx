"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { balanceCredits, costCredits, creditsText } from "@/lib/plan";

// Design "Confirmar custo" (LabIA App.dc.html · Conteúdo e etapas): the generate button opens a sheet with the
// credits now, the reservation and what is left. At HOLD_AT credits or more it asks for a 0.6 s press (or Enter
// twice). Without enough credits it opens "Créditos insuficientes" instead. Lives inside the step's <form>: the
// confirm button submits it, and the server still recomputes and checks the price.
const HOLD_AT = 100;
const HOLD_MS = 600;
const mono = "flex justify-between border-b border-lab-border py-2.5 font-mono text-body-sm";

export function CostConfirm({ costBrl, balanceBrl, label, eyebrow, detail, disabled, pending, variant = "primary" }: {
  costBrl: number | undefined; balanceBrl: number; label: string; eyebrow: string; detail: string; disabled?: boolean; pending?: boolean; variant?: "primary" | "secondary";
}) {
  const confirm = useRef<HTMLDialogElement>(null);
  const short = useRef<HTMLDialogElement>(null);
  const [progress, setProgress] = useState(0);
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | null>(null);
  const credits = costBrl === undefined ? null : costCredits(costBrl);
  const team = !Number.isFinite(balanceBrl);
  const have = team ? Infinity : balanceCredits(balanceBrl);
  const hold = (credits ?? 0) >= HOLD_AT;
  const submit = () => { confirm.current?.close(); confirm.current?.closest("form")?.requestSubmit(); };
  const stop = () => { if (timer.current) cancelAnimationFrame(timer.current); timer.current = null; setProgress(0); };
  const start = () => {
    const began = performance.now();
    const tick = () => {
      const done = Math.min(1, (performance.now() - began) / HOLD_MS);
      setProgress(done);
      if (done < 1) timer.current = requestAnimationFrame(tick); else { stop(); submit(); }
    };
    timer.current = requestAnimationFrame(tick);
  };
  const chip = credits === null ? "A calcular" : `~${creditsText(credits)}`;

  return <>
    <button type="button" disabled={disabled || pending || credits === null} aria-busy={pending}
      onClick={() => { setArmed(false); (have < (credits ?? 0) ? short : confirm).current?.showModal(); }}
      className={variant === "primary"
        ? "flex h-14 w-full items-center justify-between rounded-full bg-lab-reagent pl-[22px] pr-1.5 text-body font-semibold text-lab-on-reagent focus-visible:outline-none focus-visible:shadow-lab-focus disabled:bg-lab-surface-2 disabled:text-lab-text-disabled"
        : "flex h-[52px] w-full items-center justify-between rounded-full border-[1.5px] border-lab-border-strong pl-5 pr-1.5 text-[15px] font-semibold focus-visible:outline-none focus-visible:shadow-lab-focus disabled:text-lab-text-disabled"}>
      {pending ? "Enviando…" : label}
      <span className={variant === "primary" ? "flex h-11 items-center rounded-full bg-lab-on-reagent px-3.5 font-mono text-[15px] text-lab-reagent-bright" : "flex h-[38px] items-center rounded-full border-[1.5px] border-lab-reagent px-3 font-mono text-body-sm text-lab-reagent-bright"}>{chip}</span>
    </button>
    {credits !== null && !team && variant === "primary" ? <span className="text-center font-mono text-caption text-lab-text-dim">créditos depois ~{Math.max(0, have - credits).toLocaleString("pt-BR")}</span> : null}

    <Modal dialog={confirm} label={`Confirmar ${label.toLowerCase()}`}>
      <span className="font-mono text-caption uppercase tracking-[.08em] text-lab-text-dim">{eyebrow}</span>
      <span className="font-display text-[clamp(56px,14vw,88px)] font-black leading-[.85] text-lab-reagent-bright">{chip}</span>
      <span className="text-[15px] text-lab-text-dim">{detail}</span>
      {team ? <p className="text-body-sm text-lab-text-dim">Conta da equipe: a geração não desconta créditos.</p> : <div className="flex flex-col">
        <div className={mono}><span className="text-lab-text-dim">créditos agora</span><span>{have.toLocaleString("pt-BR")}</span></div>
        <div className={mono}><span className="text-lab-text-dim">reserva</span><span>−{(credits ?? 0).toLocaleString("pt-BR")}</span></div>
        <div className={`${mono} border-0 font-semibold`}><span>depois</span><span>~{Math.max(0, have - (credits ?? 0)).toLocaleString("pt-BR")}</span></div>
      </div>}
      <span className="text-[13px] leading-[1.5] text-lab-text-dim">Se sair mais barato, a diferença volta na hora. Se falhar, volta tudo.</span>
      {hold ? <>
        <button type="button" onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
          onKeyDown={(event) => { if (event.key !== "Enter") return; event.preventDefault(); if (armed) submit(); else setArmed(true); }}
          className="relative h-[60px] select-none overflow-hidden rounded-full bg-lab-reagent text-[17px] font-bold text-lab-on-reagent focus-visible:outline-none focus-visible:shadow-lab-focus">
          {armed ? "Enter de novo para gerar" : `Segure para gerar · ${chip}`}
          <span aria-hidden className="absolute bottom-0 left-0 h-[5px] bg-lab-on-reagent opacity-55" style={{ width: `${progress * 100}%` }} />
        </button>
        <span className="text-center text-caption text-lab-text-dim">A partir de {HOLD_AT} créditos pede 0,6 s de pressão. No teclado, Enter duas vezes.</span>
      </> : <button type="button" onClick={submit} className="h-[60px] rounded-full bg-lab-reagent text-[17px] font-bold text-lab-on-reagent focus-visible:outline-none focus-visible:shadow-lab-focus">Gerar · {chip}</button>}
      <button type="button" onClick={() => confirm.current?.close()} className="h-12 rounded-full border-[1.5px] border-lab-border-strong text-[15px] font-semibold">Agora não</button>
    </Modal>

    <Modal dialog={short} label="Créditos insuficientes">
      <span className="font-display text-[36px] font-black uppercase leading-[.95]">Créditos insuficientes</span>
      <span className="font-display text-[clamp(48px,12vw,64px)] font-black leading-[.85] text-lab-danger">faltam {creditsText(Math.max(0, (credits ?? 0) - (have === Infinity ? 0 : have)))}</span>
      <div className="flex flex-col">
        <div className={mono}><span className="text-lab-text-dim">{label.toLowerCase()}</span><span>{chip}</span></div>
        <div className={`${mono} border-0`}><span className="text-lab-text-dim">seus créditos</span><span className="text-lab-danger">{have === Infinity ? "—" : have.toLocaleString("pt-BR")}</span></div>
      </div>
      <Link href="/saldo" className="flex h-14 items-center justify-center rounded-full bg-lab-reagent text-body font-semibold text-lab-on-reagent">Ver plano</Link>
      <button type="button" onClick={() => short.current?.close()} className="h-12 rounded-full border-[1.5px] border-lab-border-strong text-[15px] font-semibold">Agora não</button>
      <span className="text-center text-[13px] text-lab-text-dim">Seu progresso fica salvo. Depois de assinar, você continua desta etapa.</span>
    </Modal>
  </>;
}
