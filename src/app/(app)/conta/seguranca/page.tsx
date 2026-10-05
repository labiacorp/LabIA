import { auth } from "@/auth";
import { googleConfigured } from "@/lib/auth-config";
import { emailEnabled } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { recentlySignedIn } from "@/lib/reauth";
import { requireUserId } from "@/lib/session";
import { SecurityPanel } from "./security-panel";

export const metadata = { title: "Acesso e segurança · LabIA" };
const notices: Record<string, string> = { senha: "Senha alterada. Os outros navegadores saíram da conta." };

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const userId = await requireUserId();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, passwordHash: true, googleSub: true } });
  const { aviso } = await searchParams;
  // Accounts with a password prove themselves by typing it, so only Google-only ones can be locked.
  const locked = !user.passwordHash && !recentlySignedIn(await auth());
  return <SecurityPanel email={user.email} hasPassword={!!user.passwordHash} googleBound={!!user.googleSub} googleReady={googleConfigured()} emailChange={emailEnabled()} locked={locked} notice={aviso ? notices[aviso] : undefined} />;
}
