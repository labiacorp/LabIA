import { AppNavigation } from "@/components/app/app-navigation";
import { getBalanceBrl, getFalCreditsUsd } from "@/lib/ledger";
import { videoUsdBrlRate } from "@/lib/video-options";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { needsConsent } from "@/lib/consent";
import { ownerSession } from "@/lib/owner";
import { refreshRate } from "@/lib/fx";
import { requireUserId } from "@/lib/session";
import { estimateReel } from "@/lib/content-plan";
import { costCredits } from "@/lib/plan";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await requireUserId();
  void refreshRate();
  const balance = await getBalanceBrl(userId)
    .then((value) => ({ ok: true as const, value }))
    .catch(() => ({ ok: false as const }));
  // Founders (unlimited) see the real fal.ai credit instead of the ledger.
  const falUsd = balance.ok && balance.value === Infinity ? await getFalCreditsUsd() : undefined;
  const influencers = await prisma.influencer.count({ where: { userId } });
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
      <AppNavigation
        name={user.name}
        email={user.email}
        avatarVersion={user.avatarUpdatedAt?.getTime()}
        balance={falUsd !== undefined ? (falUsd === null ? null : falUsd * videoUsdBrlRate()) : balance.ok ? balance.value : null}
        owner={owner}
        lowAt={costCredits(estimateReel().totalBrl)}
        // One "Novo conteúdo" button: with no influencer yet it starts at creating one.
        newContentHref={influencers ? "/conteudos/novo" : "/influenciadores/nova"}
      >
        <main id="app-content" className="mx-auto w-full max-w-wide px-4 pb-12 pt-4 md:px-6 md:pt-6">
          {children}
        </main>
      </AppNavigation>
    </>
  );
}
