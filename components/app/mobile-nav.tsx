"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { CloudOff, Folder, Home, Library, LogOut, Menu, Plug, Plus, Workflow, X } from "lucide-react";

import { accountInitials, type ShellAccount } from "@/components/app/profile-menu";
import { signOutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Projetos", href: "/projetos", icon: Folder },
  { label: "Fluxos", href: "/fluxos", icon: Workflow },
  { label: "Biblioteca", href: "/biblioteca", icon: Library },
];

export function MobileNav({ account, monthCostLabel, pathname }: {
  account: ShellAccount | null;
  monthCostLabel: string | null;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    panel?.querySelector<HTMLButtonElement>("button")?.focus();
    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab" || !panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handleKeyboard);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyboard);
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button ref={triggerRef} type="button" aria-label="Abrir navegação" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(true)} className="flex size-11 shrink-0 items-center justify-center rounded-control focus-visible:outline-none focus-visible:shadow-lab-focus md:hidden"><Menu className="size-5" aria-hidden /></button>
      {open ? (
        <div className="fixed inset-0 z-modal bg-lab-scrim md:hidden" onClick={() => setOpen(false)}>
          <div ref={panelRef} id={panelId} role="dialog" aria-modal="true" aria-label="Navegação" onClick={(event) => event.stopPropagation()} className="flex h-[100dvh] w-[calc(100%-56px)] max-w-sm flex-col overflow-y-auto border-r border-lab-border-strong bg-lab-surface-1">
            <div className="flex h-header shrink-0 items-center justify-between border-b border-lab-border pl-4 pr-1">
              <Link href="/" onClick={() => setOpen(false)} className="lab-wordmark text-[19px]">Lab<span>IA</span></Link>
              <button type="button" aria-label="Fechar navegação" onClick={() => setOpen(false)} className="flex size-11 items-center justify-center rounded-control focus-visible:outline-none focus-visible:shadow-lab-focus"><X className="size-5" aria-hidden /></button>
            </div>
            {account ? <nav aria-label="Navegação principal no celular" className="flex flex-col gap-1 p-3">
              <Link href="/criar" onClick={() => setOpen(false)} className="mb-2 flex h-12 items-center gap-2.5 rounded-control border border-lab-border-strong bg-lab-surface-2 px-3 text-[15px] font-medium"><Plus className="size-[17px]" aria-hidden />Criar</Link>
              {navigation.map(({ label, href, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return <Link key={href} href={href} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)} className={cn("flex h-12 items-center gap-2.5 rounded-control px-3 text-[15px] focus-visible:outline-none focus-visible:shadow-lab-focus", active ? "bg-lab-surface-2 text-lab-text" : "text-lab-text-dim hover:bg-lab-surface-2")}><Icon className="size-[17px] text-lab-text-dim" aria-hidden />{label}</Link>;
              })}
            </nav> : null}
            {account?.workspaceName ? <div className="mx-3 flex items-center justify-between gap-3 rounded-control border border-lab-border p-3"><span className="text-[13px] text-lab-text-dim">Gasto do mês</span><span className={cn("inline-flex items-center gap-1.5 font-mono text-sm font-medium", monthCostLabel ? "text-lab-reagent-bright" : "text-lab-text-muted")}>{monthCostLabel ?? <><CloudOff className="size-3" aria-hidden />indisponível</>}</span></div> : null}
            <div className="mt-auto flex flex-col gap-0.5 border-t border-lab-border p-3">
              {account ? <>
                <div className="flex items-center gap-2.5 px-1 py-2"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-lab-border font-display text-xs font-semibold">{accountInitials(account.name)}</span><span className="min-w-0"><span className="block truncate text-sm font-medium">{account.name}</span><span className="block truncate text-xs text-lab-text-dim">{account.workspaceName ?? account.email}</span></span></div>
                <Link href="/" onClick={() => setOpen(false)} className="flex h-11 items-center gap-2.5 rounded-control px-1 text-sm"><Home className="size-4 text-lab-text-dim" aria-hidden />Painel</Link>
                <Link href="/conexoes" onClick={() => setOpen(false)} className="flex h-11 items-center gap-2.5 rounded-control px-1 text-sm"><Plug className="size-4 text-lab-text-dim" aria-hidden />Conexões</Link>
                <form action={signOutAction}><button type="submit" className="flex h-11 w-full items-center gap-2.5 rounded-control px-1 text-sm"><LogOut className="size-4 text-lab-text-dim" aria-hidden />Sair</button></form>
              </> : <>
                <Link href="/criar-conta" onClick={() => setOpen(false)} className="flex h-11 items-center justify-center rounded-control bg-lab-reagent text-sm font-semibold text-lab-bg">Criar conta</Link>
                <Link href="/entrar" onClick={() => setOpen(false)} className="flex h-11 items-center justify-center rounded-control border border-lab-border-strong bg-lab-surface-2 text-sm font-medium">Entrar</Link>
              </>}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
