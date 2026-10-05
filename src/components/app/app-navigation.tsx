"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import {
  Menu,
  X,
  LayoutDashboard,
  Sparkles,
  Users,
  Film,
  Wallet,
  UserRound,
  LogOut,
  Library,
  BookOpen,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { logout } from "@/app/(app)/actions";
import { AccountAvatar } from "@/components/app/account-avatar";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { CostChip } from "@/components/ui/cost-chip";

const links = [
  { href: "/painel", label: "Painel", icon: LayoutDashboard },
  { href: "/", label: "Estúdio", icon: Sparkles },
  { href: "/influenciadores", label: "Influenciadores", icon: Users },
  { href: "/conteudos", label: "Conteúdos", icon: Film },
  { href: "/trends", label: "Trends", icon: Sparkles },
  { href: "/modelos", label: "Modelos", icon: BookOpen },
  { href: "/biblioteca", label: "Biblioteca", icon: Library },
];
const itemClass =
  "flex min-h-11 items-center gap-3 rounded-control px-3 text-body-sm transition-colors hover:bg-lab-surface-2 focus-visible:outline-none focus-visible:shadow-lab-focus";

export function AppNavigation({
  name,
  email,
  balance,
  avatarVersion,
}: {
  name: string | null;
  email: string;
  balance: number | null;
  avatarVersion?: number;
}) {
  const pathname = usePathname();
  const navigation = useRef<HTMLDialogElement>(null);
  const account = useRef<HTMLDialogElement>(null);
  const create = useRef<HTMLDialogElement>(null);
  const displayName = name || email.split("@")[0];
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const menuLinks = () =>
    links.map(({ href, label, icon: Icon }) => (
      <Link
        key={href}
        href={href}
        aria-current={active(href) ? "page" : undefined}
        className={`${itemClass} ${active(href) ? "bg-lab-surface-2 font-medium" : "text-lab-text-dim"}`}
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        {label}
      </Link>
    ));
  return (
    <>
      <div className="shell-toolbar">
      <button
        type="button"
        className="lab-hit-target rounded-control md:hidden"
        aria-label="Abrir navegação"
        onClick={() => navigation.current?.showModal()}
      >
        <Menu className="mx-auto size-5" />
      </button>
      <Link
        href="/painel"
        aria-label="LabIA, painel"
        className="lab-wordmark rounded-control focus-visible:outline-none focus-visible:shadow-lab-focus"
      >
        Lab<span>IA</span>
      </Link>
      <span className="hidden border-l border-lab-border pl-4 text-caption text-lab-text-muted md:block">Seu laboratório criativo</span>
      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
        <Link
          href="/saldo"
          aria-label="Ver saldo e extrato"
          className="hidden rounded-control focus-visible:outline-none focus-visible:shadow-lab-focus sm:block"
        >
          <CostChip
            state={balance === null ? "unavailable" : "actual"}
            plain
            value={balance ?? undefined}
            prefix="saldo"
          />
        </Link>
        <button type="button" onClick={() => create.current?.showModal()} className="shell-create" aria-label="Criar nova produção">
          <Plus className="size-4" aria-hidden /><span className="hidden sm:inline">Criar</span>
        </button>
        <button
          type="button"
          onClick={() => account.current?.showModal()}
          aria-label={`Abrir conta de ${displayName}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-lab-border-strong bg-lab-surface-2 text-caption font-semibold focus-visible:outline-none focus-visible:shadow-lab-focus"
        >
          <AccountAvatar name={displayName} version={avatarVersion} />
        </button>
      </div>
      </div>
      <div className="shell-navigation-row">
        <nav aria-label="Navegação principal" className="shell-navigation">{menuLinks()}</nav>
        <span className="hidden items-center gap-2 whitespace-nowrap text-caption text-lab-text-muted lg:flex"><span className="lab-status-dot bg-lab-reagent" />Beta</span>
      </div>
      <dialog ref={create} className="app-menu-dialog shell-create-dialog" aria-labelledby="create-title" onClick={(event) => { if(event.target === event.currentTarget) create.current?.close(); }}>
        <div className="flex items-center justify-between border-b border-lab-border p-5"><div><p className="mb-1 text-caption text-lab-text-muted">UMA IDEIA, VÁRIOS CAMINHOS</p><h2 id="create-title" className="font-display text-xl">O que vamos criar?</h2></div><button className="lab-hit-target" aria-label="Fechar menu criar" onClick={() => create.current?.close()}><X className="mx-auto size-5" /></button></div>
        <div className="grid gap-2 p-3">
          {[{href:"/",title:"Um personagem",description:"Defina a identidade e monte suas referências.",icon:Users},{href:"/conteudos/novo",title:"Uma produção",description:"Transforme seu briefing em conteúdo.",icon:Film},{href:"/trends",title:"Recriar um movimento",description:"Combine um vídeo com seus personagens.",icon:Sparkles}].map(({href,title,description,icon:Icon}) => <Link key={href} href={href} onClick={() => create.current?.close()} className="shell-create-option"><span className="shell-option-icon"><Icon className="size-5" /></span><span className="min-w-0 flex-1"><span className="block font-medium">{title}</span><span className="mt-1 block text-body-sm text-lab-text-dim">{description}</span></span><ArrowUpRight className="size-4 shrink-0 text-lab-text-muted" /></Link>)}
        </div>
      </dialog>
      <dialog
        ref={navigation}
        className="app-menu-dialog app-navigation-dialog"
        aria-labelledby="navigation-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) navigation.current?.close();
        }}
      >
        <div className="flex items-center justify-between border-b border-lab-border p-4">
          <h2 id="navigation-title" className="font-display text-lg">
            Seu laboratório
          </h2>
          <button
            aria-label="Fechar navegação"
            className="lab-hit-target"
            onClick={() => navigation.current?.close()}
          >
            <X className="mx-auto size-5" />
          </button>
        </div>
        <nav
          aria-label="Navegação mobile"
          className="grid gap-1 p-3"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a"))
              navigation.current?.close();
          }}
        >
          {menuLinks()}
          <Link
            href="/conta"
            className={itemClass}
            onClick={() => navigation.current?.close()}
          >
            <UserRound className="size-4" />
            Minha conta
          </Link>
          <Link
            href="/saldo"
            className={itemClass}
            onClick={() => navigation.current?.close()}
          >
            <Wallet className="size-4" />
            Saldo e extrato
          </Link>
        </nav>
      </dialog>
      <dialog
        ref={account}
        className="app-menu-dialog app-account-dialog"
        aria-labelledby="account-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) account.current?.close();
        }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-lab-border p-4">
          <div className="min-w-0">
            <h2 id="account-title" className="break-words font-medium">
              {displayName}
            </h2>
            <p className="mt-1 break-all text-caption text-lab-text-dim">
              {email}
            </p>
          </div>
          <button
            aria-label="Fechar conta"
            className="lab-hit-target shrink-0"
            onClick={() => account.current?.close()}
          >
            <X className="mx-auto size-4" />
          </button>
        </div>
        <div className="grid gap-1 p-2">
          <Link
            href="/conta"
            className={itemClass}
            onClick={() => account.current?.close()}
          >
            <UserRound className="size-4" />
            Minha conta
          </Link>
          <Link
            href="/saldo"
            className={itemClass}
            onClick={() => account.current?.close()}
          >
            <Wallet className="size-4" />
            Saldo e extrato
            <span className="ml-auto text-caption">{balance === null ? "Indisponível" : balance.toLocaleString("pt-BR", {style:"currency",currency:"BRL"})}</span>
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className={`${itemClass} w-full border-t border-lab-border`}
            >
              <LogOut className="size-4" />
              Sair da conta
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
