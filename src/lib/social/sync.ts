import { prisma } from "@/lib/prisma";
import { saveConnectedAccounts } from "./accounts";
import { getPublisher } from "./publisher";

const SYNC_TIMEOUT_MS = 6_000;

// The portal return trip may never reach our callback (closed tab, other device), so on page open we also
// list the user's bundle.social team and register accounts we do not know yet. Additive only: an existing
// row (of anyone, in any status) is never touched, and nothing is disconnected because a listing was empty.
// Never throws; real backend only (mock mode has nothing to list).
export async function syncBundleAccounts(userId: string): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const publisher = getPublisher("bundle");
    if (publisher.backend !== "bundle") return;
    const tenant = await prisma.socialTenant.findUnique({ where: { userId_backend: { userId, backend: "bundle" } } });
    if (!tenant) return;
    const listed = await Promise.race([
      publisher.finishConnect({ userId, redirectUri: "", params: new URLSearchParams(), secret: null }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("bundle sync timed out")), SYNC_TIMEOUT_MS);
      }),
    ]);
    if (!listed.length) return;
    const known = await prisma.socialAccount.findMany({
      where: { backend: "bundle", providerAccountId: { in: listed.map((a) => a.providerAccountId) } },
      select: { providerAccountId: true },
    });
    const have = new Set(known.map((row) => row.providerAccountId));
    for (const account of listed) {
      if (have.has(account.providerAccountId)) continue;
      try {
        await saveConnectedAccounts(userId, "bundle", [account]);
      } catch {
        // One bad account (for example a race with another user) must not hide the others.
      }
    }
  } catch {
    // Best effort: the page renders with what we already have.
  } finally {
    clearTimeout(timer);
  }
}
