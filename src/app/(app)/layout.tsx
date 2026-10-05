import { AppNavigation } from "@/components/app/app-navigation";
import { getBalanceBrl } from "@/lib/ledger";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await requireUserId();
  const balance = await getBalanceBrl(userId)
    .then((value) => ({ ok: true as const, value }))
    .catch(() => ({ ok: false as const }));
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true, avatarUpdatedAt: true },
  });

  return (
    <>
      <a
        href="#app-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-modal focus:bg-lab-surface-1 focus:p-3"
      >
        Ir para o conteúdo
      </a>
      <header className="shell-header sticky top-0 z-header">
        <AppNavigation
          name={user.name}
          email={user.email}
          avatarVersion={user.avatarUpdatedAt?.getTime()}
          balance={balance.ok ? balance.value : null}
        />
      </header>
      <main
        id="app-content"
        className="workspace-main mx-auto w-full max-w-wide px-4 pb-16 pt-6 md:px-8 md:pt-8"
      >
        {children}
      </main>
    </>
  );
}
