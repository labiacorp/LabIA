"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CloudOff, Plus } from "lucide-react";

import { MobileNav } from "@/components/app/mobile-nav";
import { ProfileMenu, type ShellAccount } from "@/components/app/profile-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  account: ShellAccount | null;
  monthCostLabel: string | null;
};

const primaryNav = [
  { label: "Projetos", href: "/projetos" },
  { label: "Fluxos", href: "/fluxos" },
  { label: "Biblioteca", href: "/biblioteca" },
];

// Telas de conta e do sistema de design: sem a barra do app (têm o AuthShell ou o próprio layout).
const BARE_PATHS = ["/design-system", "/entrar", "/sem-acesso", "/criar-conta", "/esqueci-a-senha", "/redefinir-senha"];

export function AppShell({ children, account, monthCostLabel }: AppShellProps) {
  const pathname = usePathname();

  if (BARE_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return children;
  }

  return (
    <div className="flex min-h-screen flex-col bg-lab-bg text-lab-text">
      <header className="sticky top-0 z-header flex h-header shrink-0 items-center gap-1 border-b border-lab-border bg-lab-surface-1 pl-1 pr-1.5 md:gap-8 md:px-6">
        <MobileNav account={account} monthCostLabel={monthCostLabel} pathname={pathname} />
        <Link href="/" aria-label="LabIA, início" className="lab-wordmark shrink-0 rounded-control text-[19px] focus-visible:outline-none focus-visible:shadow-lab-focus md:text-xl">
          Lab<span>IA</span>
        </Link>
        {account ? <nav aria-label="Navegação principal" className="hidden items-center gap-1 md:flex">
          {primaryNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn(
                "flex h-8 items-center rounded-control px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:shadow-lab-focus",
                active ? "bg-lab-surface-2 text-lab-text" : "text-lab-text-dim hover:bg-lab-surface-2 hover:text-lab-text",
              )}>{item.label}</Link>
            );
          })}
        </nav> : null}
        <div className="ml-auto flex min-w-0 items-center gap-1 md:gap-8">
          {account?.workspaceName ? (
            <span aria-label={monthCostLabel ? `Gasto do mês: ${monthCostLabel}` : "Gasto do mês indisponível"} className={cn(
              "inline-flex h-[26px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 font-mono text-caption font-medium tabular-nums md:h-7 md:gap-1.5 md:px-2.5 md:text-xs",
              monthCostLabel ? "border-lab-reagent-line bg-lab-reagent-dim text-lab-reagent-bright" : "border-lab-border bg-lab-surface-2 text-lab-text-muted",
            )}>
              <span className="text-lab-text-muted">mês</span>
              {monthCostLabel ?? <><CloudOff className="size-3" aria-hidden /><span className="hidden md:inline">indisponível</span></>}
            </span>
          ) : null}
          {account ? <>
            <Button asChild variant="secondary" className="hidden border-lab-border-strong md:inline-flex"><Link href="/criar"><Plus aria-hidden />Criar</Link></Button>
            <Link href="/criar" aria-label="Criar" className="flex size-11 items-center justify-center rounded-control focus-visible:outline-none focus-visible:shadow-lab-focus md:hidden"><span className="flex size-8 items-center justify-center rounded-control border border-lab-border-strong bg-lab-surface-2"><Plus className="size-4" aria-hidden /></span></Link>
          </> : <Button asChild variant="secondary" className="border-lab-border-strong"><Link href="/criar-conta">Criar conta</Link></Button>}
          <div className="hidden md:block"><ProfileMenu account={account} /></div>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
