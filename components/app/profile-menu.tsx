"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Check, FlaskConical, Home, LogOut, MonitorSmartphone, Plug, Ticket } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { signOutAction, signOutEverywhereAction } from "@/lib/auth/actions";

export type ShellAccount = { name: string; email: string; workspaceName: string | null; isAdmin: boolean };

export function accountInitials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).filter((_, index, parts) => index === 0 || index === parts.length - 1).join("").toUpperCase();
}

const itemClass = "flex min-h-9 w-full items-center gap-2.5 rounded-control px-2 py-2 text-left text-sm text-lab-text transition-colors hover:bg-lab-surface-2 focus-visible:outline-none focus-visible:shadow-lab-focus [&_svg]:size-4 [&_svg]:text-lab-text-dim";

export function ProfileMenu({ account }: { account: ShellAccount | null }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (!account) return <Link href="/entrar" className={buttonVariants({ variant: "ghost" })}>Entrar</Link>;

  return (
    <div ref={rootRef} className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <button ref={triggerRef} type="button" aria-label={`Conta de ${account.name}`} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)} className="flex size-8 items-center justify-center rounded-full bg-lab-border font-display text-xs font-semibold text-lab-text shadow-[0_0_0_2px_var(--lab-surface-1),0_0_0_3px_var(--lab-border-strong)] transition-colors hover:bg-lab-border-strong focus-visible:outline-none focus-visible:shadow-lab-focus">{accountInitials(account.name)}</button>
      {open ? (
        <div id={panelId} aria-label="Menu da conta" className="absolute right-0 top-11 z-modal w-[280px] overflow-hidden rounded-lab bg-lab-surface-1 shadow-lab-popover">
          <div className="border-b border-lab-border p-3.5"><p className="truncate text-sm font-medium">{account.name}</p><p className="mt-0.5 truncate text-xs text-lab-text-dim">{account.email}</p></div>
          {account.workspaceName ? <div className="border-b border-lab-border p-1.5"><p className="px-2 py-1.5 font-mono text-eyebrow uppercase text-lab-text-muted">Workspace</p><p className="flex items-center justify-between gap-2 rounded-control bg-lab-surface-2 p-2 text-sm"><span className="truncate">{account.workspaceName}</span><Check className="size-3.5 text-lab-text-dim" aria-label="Workspace atual" /></p></div> : null}
          <div className="p-1.5">
            <Link href="/" onClick={() => setOpen(false)} className={itemClass}><Home aria-hidden />Painel</Link>
            <Link href="/conexoes" onClick={() => setOpen(false)} className={itemClass}><Plug aria-hidden />Conexões</Link>
            {account.isAdmin ? <Link href="/admin/convites" onClick={() => setOpen(false)} className={itemClass}><Ticket aria-hidden />Convites</Link> : null}
            <p className="flex items-start gap-2.5 px-2 py-2 text-[13px] leading-5 text-lab-text-dim"><FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden /><span>Em breve: Copy, Calendário e Research</span></p>
            <div className="mt-1 border-t border-lab-border pt-1"><form action={signOutAction}><button type="submit" className={itemClass}><LogOut aria-hidden />Sair</button></form><form action={signOutEverywhereAction}><button type="submit" className={itemClass}><MonitorSmartphone aria-hidden />Sair de todos os aparelhos</button></form></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
