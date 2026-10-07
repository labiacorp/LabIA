import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  REFERRAL_COOKIE,
  REFERRAL_TTL,
  validReferralCode,
} from "@/lib/referrals";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const exists =
    validReferralCode(code) &&
    (await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    }));
  const response = NextResponse.redirect(
    new URL("/criar-conta", request.url),
  );
  response.headers.set("Cache-Control", "private, no-store");
  // Preserve first-touch attribution during its 30-day lifetime.
  if (
    exists &&
    !validReferralCode(request.cookies.get(REFERRAL_COOKIE)?.value)
  ) {
    response.cookies.set(REFERRAL_COOKIE, code, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: REFERRAL_TTL,
      path: "/",
    });
  }
  return response;
}
