import { AppNavigation } from "@/components/app/app-navigation";
import { getBalanceBrl, getFalCreditsUsd } from "@/lib/ledger";
import { videoUsdBrlRate } from "@/lib/video-options";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { needsConsent } from "@/lib/consent";
import { ownerSession } from "@/lib/owner";
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
  // Founders (unlimited) see the real fal.ai credit instead of the ledger.
  const falUsd = balance.ok && balance.value === Infinity ? await getFalCreditsUsd() : undefined;
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true, avatarUpdatedAt: true, role: true, createdAt: true, consentAcceptedAt: true },
  });
  // Accounts created through Google never saw the sign-up checkbox; they accept once, here.
  if (needsConsent(user)) redirect("/consentimento");
  // Only decides whether the Admin link shows; /admin checks again on its own (requireOwner).
  const owner = user.role === "OWNER" && ownerSession(await auth());

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
          balance={falUsd !== undefined ? (falUsd === null ? null : falUsd * videoUsdBrlRate()) : balance.ok ? balance.value : null}
          owner={owner}
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
