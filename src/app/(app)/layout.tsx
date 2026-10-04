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
      <header className="sticky top-0 z-header flex h-header items-center gap-2 border-b border-lab-border bg-lab-surface-1 px-3 md:px-6">
        <AppNavigation
          name={user.name}
          email={user.email}
          avatarVersion={user.avatarUpdatedAt?.getTime()}
          balance={balance.ok ? balance.value : null}
        />
      </header>
      <main
        id="app-content"
        className="mx-auto w-full max-w-wide px-3 pb-16 pt-4 md:px-6"
      >
        {children}
      </main>
    </>
  );
}
