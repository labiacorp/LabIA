import { getReferralCode, referralStats } from "@/lib/referrals";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { AccountSettings } from "./account-settings";

export default async function AccountPage() {
  const userId = await requireUserId();
  const [user, referralCode, referral] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true, avatarUpdatedAt: true } }),
    getReferralCode(userId),
    referralStats(userId),
  ]);
  return <AccountSettings name={user.name || user.email.split("@")[0]} email={user.email} avatarVersion={user.avatarUpdatedAt?.getTime()} referralCode={referralCode} referral={referral} />;
}
