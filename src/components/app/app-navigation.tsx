"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, type ReactNode } from "react";
import { Film, House, Library, LogOut, Menu, Cpu, Plug, Plus, ShieldCheck, TrendingUp, UserRound, Wallet, X, type LucideIcon } from "lucide-react";
import { logout } from "@/app/(app)/actions";
import { AccountAvatar } from "@/components/app/account-avatar";

type NavItem = { href: string; label: string; icon: LucideIcon; admin?: boolean };
const main: NavItem[] = [
  { href: "/painel", label: "Início", icon: House },
  { href: "/influenciadores", label: "Influencers", icon: UserRound },
  { href: "/conteudos", label: "Conteúdos", icon: Film },
  { href: "/biblioteca", label: "Biblioteca", icon: Library },
  { href: "/modelos", label: "Modelos", icon: Cpu },
  { href: "/trends", label: "Tendências", icon: TrendingUp },
  { href: "/conexoes", label: "Conexões", icon: Plug },
];
const footer: NavItem[] = [
  { href: "/saldo", label: "Saldo e extrato", icon: Wallet },
  { href: "/admin", label: "Admin", icon: ShieldCheck, admin: true },
];
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const focus = "focus-visible:outline-none focus-visible:shadow-lab-focus";
const wordmark = (size: string) => <span className={`lab-wordmark ${size} leading-none`}>Lab<span>I</span>A</span>;

export function AppNavigation({ name, email, balance, avatarVersion, owner = false, children }: {
  name: string | null; email: string; balance: number | null; avatarVersion?: number; owner?: boolean; children: ReactNode;
}) {
  const pathname = usePathname();
  const sheet = useRef<HTMLDialogElement>(null);
  const account = useRef<HTMLDialogElement>(null);
  const displayName = name || email.split("@")[0];
  const active = (href: string) => pathname === href || (href !== "/painel" && pathname.startsWith(href));
  const items = (list: NavItem[]) => list.filter((i) => !i.admin || owner).map(({ href, label, icon: Icon }) => (
    <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
      className={`flex h-11 items-center gap-3 rounded-lab px-3 text-body-sm transition-colors ${focus} ${active(href) ? "bg-lab-surface-2 font-semibold text-lab-text" : "text-lab-text-dim hover:bg-lab-surface-1 hover:text-lab-text"}`}>
      <Icon className="size-[18px] shrink-0" aria-hidden />{label}
      {href === "/saldo" && balance !== null ? <span className="ml-auto font-mono text-caption text-lab-reagent-bright">{brl(balance)}</span> : null}
    </Link>
  ));
  const current = [...main, ...footer].find((i) => active(i.href))?.label ?? (pathname.startsWith("/conta") ? "Conta" : "LabIA");
  const create = (cls: string) => <Link href="/conteudos/novo" className={`${cls} flex h-12 items-center justify-center gap-2 rounded-full bg-lab-text font-semibold text-lab-on-reagent hover:bg-white ${focus}`}><Plus className="size-[18px]" aria-hidden />Novo conteúdo</Link>;
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-lab-border bg-lab-bg p-3 lg:flex">
        <Link href="/painel" aria-label="LabIA, início" className={`flex h-12 items-center px-3 ${focus}`}>{wordmark("text-[28px]")}</Link>
        {create("mb-3 mt-4")}
        <nav aria-label="Navegação principal" className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {items(main)}
          <span className="mx-3 my-2 h-px bg-lab-border" />
          {items(footer)}
        </nav>
        <span className="flex items-center gap-2 px-3 py-2 text-caption text-lab-text-muted"><span className="lab-status-dot bg-lab-reagent" />Beta fechado</span>
      </aside>
      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2.5 border-b border-lab-border bg-lab-bg/90 px-4 backdrop-blur md:px-8">
          <Link href="/painel" aria-label="LabIA, início" className={`lg:hidden ${focus}`}>{wordmark("text-[26px]")}</Link>
          <span className="hidden text-body-sm text-lab-text-dim lg:block">{current}</span>
          <span className="ml-auto" />
          <Link href="/saldo" aria-label="Ver saldo e extrato" className={`rounded-full ${focus}`}>
            <span className="flex h-11 items-center gap-2 rounded-full border-[1.5px] border-lab-reagent px-3.5 font-mono text-body-sm text-lab-reagent-bright">
              <span className="text-caption text-lab-text-dim">saldo</span>{balance === null ? "indisponível" : brl(balance)}
            </span>
          </Link>
          <button type="button" onClick={() => account.current?.showModal()} aria-label={`Abrir conta de ${displayName}`} className={`hidden size-11 items-center justify-center rounded-full bg-lab-surface-2 lg:flex ${focus}`}><AccountAvatar name={displayName} version={avatarVersion} /></button>
          <button type="button" onClick={() => sheet.current?.showModal()} aria-label="Abrir menu" className={`flex size-11 items-center justify-center rounded-full bg-lab-surface-2 lg:hidden ${focus}`}><Menu className="size-5" /></button>
        </header>
        {children}
      </div>

      <dialog ref={sheet} className="app-menu-dialog app-navigation-dialog" aria-labelledby="sheet-title" onClick={(e) => { if (e.target === e.currentTarget) sheet.current?.close(); }}>
        <div className="flex items-center justify-between border-b border-lab-border p-4">
          <h2 id="sheet-title" className="font-display text-xl">Menu</h2>
          <button aria-label="Fechar menu" className="lab-hit-target" onClick={() => sheet.current?.close()}><X className="mx-auto size-5" /></button>
        </div>
        <div className="grid gap-1 p-3" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) sheet.current?.close(); }}>
          {create("mb-2")}
          {items(main)}
          <span className="mx-3 my-1 h-px bg-lab-border" />
          {items(footer)}
          <Link href="/conta" className={`flex h-11 items-center gap-3 rounded-lab px-3 text-body-sm text-lab-text-dim ${focus}`}><UserRound className="size-[18px]" />Minha conta</Link>
          <form action={logout}><button type="submit" className={`flex h-11 w-full items-center gap-3 rounded-lab px-3 text-body-sm text-lab-text-dim ${focus}`}><LogOut className="size-[18px]" />Sair da conta</button></form>
        </div>
      </dialog>

      <dialog ref={account} className="app-menu-dialog app-account-dialog" aria-labelledby="account-title" onClick={(e) => { if (e.target === e.currentTarget) account.current?.close(); }}>
        <div className="flex items-start justify-between gap-3 border-b border-lab-border p-4">
          <div className="min-w-0"><h2 id="account-title" className="break-words font-semibold">{displayName}</h2><p className="mt-1 break-all text-caption text-lab-text-dim">{email}</p></div>
          <button aria-label="Fechar conta" className="lab-hit-target shrink-0" onClick={() => account.current?.close()}><X className="mx-auto size-4" /></button>
        </div>
        <div className="grid gap-1 p-2">
          <Link href="/conta" onClick={() => account.current?.close()} className={`flex h-11 items-center gap-3 rounded-lab px-3 text-body-sm hover:bg-lab-surface-2 ${focus}`}><UserRound className="size-4" />Perfil e conta</Link>
          <Link href="/saldo" onClick={() => account.current?.close()} className={`flex h-11 items-center gap-3 rounded-lab px-3 text-body-sm hover:bg-lab-surface-2 ${focus}`}><Wallet className="size-4" />Saldo e extrato</Link>
          <form action={logout}><button type="submit" className={`flex h-11 w-full items-center gap-3 rounded-lab border-t border-lab-border px-3 text-body-sm hover:bg-lab-surface-2 ${focus}`}><LogOut className="size-4" />Sair da conta</button></form>
        </div>
      </dialog>
    </>
  );
}
