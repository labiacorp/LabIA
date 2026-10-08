"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, type ReactNode } from "react";
import { Cpu, FileText, Film, House, KeyRound, Library, LogOut, Mail, Menu, Plus, Receipt, Share2, ShieldCheck, TrendingUp, UserRound, Wallet, X, type LucideIcon } from "lucide-react";
import { logout } from "@/app/(app)/actions";
import { AccountAvatar } from "@/components/app/account-avatar";
import { balanceCredits } from "@/lib/plan";

// Shell from the design (LabIA App.dc.html · Header e menus). Integrações is the publishing area (connect networks, publish, schedule).
type NavItem = { href: string; label: string; icon: LucideIcon; admin?: boolean; money?: boolean; owner?: boolean };
const main: NavItem[] = [
  { href: "/painel", label: "Início", icon: House },
  { href: "/influenciadores", label: "Influencers", icon: UserRound },
  { href: "/conteudos", label: "Conteúdos", icon: Film },
  { href: "/biblioteca", label: "Biblioteca", icon: Library },
  { href: "/modelos", label: "Modelos", icon: Cpu },
  // Owners only while motion recreation is being tried out (the page and its actions check again with requireOwner).
  { href: "/trends", label: "Tendências", icon: TrendingUp, owner: true },
];
const footer: NavItem[] = [
  { href: "/saldo", label: "Saldo e extrato", icon: Wallet, money: true },
  { href: "/admin", label: "Admin", icon: ShieldCheck, admin: true },
];
const profile: NavItem[] = [
  { href: "/conta", label: "Perfil", icon: UserRound },
  { href: "/integracoes", label: "Integrações", icon: Share2 },
  { href: "/conta/seguranca", label: "Trocar senha", icon: KeyRound },
  { href: "/conta/seguranca", label: "Trocar e-mail", icon: Mail },
  { href: "/saldo", label: "Saldo e extrato", icon: Receipt, money: true },
  { href: "/termos", label: "Termos e privacidade", icon: FileText },
];
const focus = "focus-visible:outline-none focus-visible:shadow-lab-focus";
const wordmark = (size: string) => <span className={`lab-wordmark ${size} leading-none`}>Lab<span>I</span>A</span>;

export function AppNavigation({ name, email, balance, lowAt, newContentHref, avatarVersion, owner = false, children }: {
  name: string | null; email: string; balance: number | null; lowAt: number; newContentHref: string; avatarVersion?: number; owner?: boolean; children: ReactNode;
}) {
  const pathname = usePathname();
  const sheet = useRef<HTMLDialogElement>(null);
  const displayName = name || email.split("@")[0];
  const credits = balance === null ? null : balanceCredits(balance);
  const amount = credits === null ? "indisponível" : credits.toLocaleString("pt-BR");
  // Chip colour follows the design: lime, warning when a 15s video no longer fits, danger at zero.
  const tone = credits === null ? "text-lab-text-muted border-lab-border-strong" : credits === 0 ? "text-lab-danger border-lab-danger" : credits < lowAt ? "text-lab-warning border-lab-warning" : "text-lab-reagent-bright border-lab-reagent";
  const active = (href: string) => pathname === href || (href !== "/painel" && pathname.startsWith(href));
  const close = () => sheet.current?.close();

  const row = (item: NavItem, big = false) => (
    <Link key={item.href + item.label} href={item.href} onClick={close} aria-current={active(item.href) ? "page" : undefined}
      className={`flex items-center rounded-control px-3 transition-colors ${focus} ${big ? "min-h-[52px] gap-3.5 text-body" : "h-11 gap-3 text-[15px]"} ${active(item.href) ? "bg-lab-surface-2 font-semibold text-lab-text" : "text-lab-text-dim hover:bg-lab-surface-1 hover:text-lab-text"}`}>
      <item.icon className={`${big ? "size-5" : "size-[19px]"} shrink-0 ${item.money ? "text-lab-reagent-bright" : ""}`} aria-hidden />
      <span className="flex-1">{item.label}</span>
      {item.money ? <span className="font-mono text-[13px] text-lab-reagent-bright">{amount}</span> : null}
    </Link>
  );
  const create = (cls: string) => <Link href={newContentHref} onClick={close} className={`${cls} flex items-center justify-center gap-2 rounded-full bg-lab-text font-semibold text-lab-bg hover:bg-white ${focus}`}><Plus className="size-4" aria-hidden />Novo conteúdo</Link>;
  const who = <><span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-lab-surface-3"><AccountAvatar name={displayName} version={avatarVersion} /></span><span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-[15px] font-semibold">{displayName}</span><span className="truncate text-[13px] text-lab-text-dim">{email}</span></span></>;
  const signOut = (cls: string) => <form action={logout}><button type="submit" className={`flex w-full items-center rounded-control px-3 text-left hover:bg-lab-surface-2 ${focus} ${cls}`}><LogOut className="size-[18px] shrink-0 text-lab-text-dim" aria-hidden />Sair</button></form>;

  const link = (item: NavItem) => (
    <Link key={item.href} href={item.href} aria-current={active(item.href) ? "page" : undefined}
      className={`flex h-9 items-center rounded-full px-3 text-body-sm transition-colors ${focus} ${active(item.href) ? "bg-lab-surface-2 font-semibold text-lab-text" : "text-lab-text-dim hover:bg-lab-surface-1 hover:text-lab-text"}`}>
      {item.label}
    </Link>
  );

  return (
    <>
      <header className="sticky top-0 z-header flex h-header items-center gap-2 border-b border-lab-border bg-lab-bg/90 px-4 backdrop-blur lg:gap-1 lg:px-6">
        <Link href="/painel" aria-label="A LabIA, início" className={`mr-1 lg:mr-4 ${focus}`}>{wordmark("text-[24px]")}</Link>
        <nav aria-label="Navegação principal" className="hidden items-center gap-0.5 lg:flex">
          {main.filter((i) => !i.owner || owner).map(link)}
          {owner ? link(footer.find((i) => i.admin)!) : null}
        </nav>
        <span className="ml-auto" />
        {create("hidden h-9 gap-1.5 px-3.5 text-body-sm lg:flex")}
        <Link href="/saldo" aria-label={`Créditos: ${amount}`} className={`flex h-9 items-center gap-1.5 rounded-full border-[1.5px] bg-transparent pl-3 font-mono text-body-sm ${credits === 0 ? "pr-1" : "pr-3"} ${tone} ${focus}`}>
          <span className="text-[11px] text-lab-text-dim">créditos</span>{amount}
          {credits === 0 ? <span className="flex h-7 items-center rounded-full bg-lab-reagent px-2.5 font-sans text-caption font-semibold text-lab-on-reagent">Ver plano</span> : null}
        </Link>
        <button type="button" popoverTarget="profile-menu" aria-label="Abrir menu do perfil" className={`hidden size-9 items-center justify-center overflow-hidden rounded-full bg-lab-surface-3 text-caption font-semibold lg:flex ${focus}`}><AccountAvatar name={displayName} version={avatarVersion} /></button>
        <button type="button" onClick={() => sheet.current?.showModal()} aria-label="Abrir menu" className={`flex size-10 items-center justify-center rounded-full bg-lab-surface-2 lg:hidden ${focus}`}><Menu className="size-[18px]" aria-hidden /></button>
      </header>
      {children}

      <div id="profile-menu" popover="auto" className="app-profile-menu" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) (e.currentTarget as HTMLElement).hidePopover(); }}>
        <div className="flex items-center gap-3 p-3">{who}</div>
        <span className="mx-2 my-1 block h-px bg-lab-border" />
        {profile.map((item) => (
          <Link key={item.label} href={item.href} className={`flex h-12 items-center gap-3 rounded-lab px-3 text-[15px] hover:bg-lab-surface-2 ${focus}`}>
            <item.icon className={`size-[18px] shrink-0 ${item.money ? "text-lab-reagent-bright" : "text-lab-text-dim"}`} aria-hidden /><span className="flex-1">{item.label}</span>
            {item.money ? <span className="font-mono text-[13px] text-lab-reagent-bright">{amount}</span> : null}
          </Link>
        ))}
        {signOut("h-12 gap-3 text-[15px]")}
      </div>

      <dialog ref={sheet} className="app-mobile-menu" aria-label="Menu">
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-lab-border px-4">
          {wordmark("text-[26px]")}
          <button type="button" onClick={close} aria-label="Fechar menu" className={`ml-auto flex size-11 items-center justify-center rounded-full bg-lab-surface-2 ${focus}`}><X className="size-5" aria-hidden /></button>
        </div>
        <nav aria-label="Menu" className="flex flex-1 flex-col overflow-y-auto px-2 pb-6 pt-3">
          <div className="mb-2 flex items-center gap-3 rounded-card bg-lab-surface-1 p-3">{who}<span className="font-mono text-[15px] text-lab-reagent-bright">{amount}</span></div>
          {main.filter((i) => !i.owner || owner).map((item) => row(item, true))}
          <span className="mx-3 my-2 h-px bg-lab-border" />
          {footer.filter((i) => !i.admin || owner).map((item) => row(item, true))}
          <span className="mx-3 my-2 h-px bg-lab-border" />
          {profile.map((item) => row(item, true))}
          {signOut("min-h-[52px] gap-3.5 text-body")}
        </nav>
        <div className="border-t border-lab-border px-4 pb-7 pt-3">{create("h-14 w-full text-body")}</div>
      </dialog>
    </>
  );
}
