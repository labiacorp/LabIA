import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { cookies } from "next/headers";
import { registerSignIn, REFERRAL_COOKIE } from "@/lib/referrals";
import { z } from "zod";
import { hasPass } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { clientIp, hit } from "@/lib/rate-limit";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
    // How and when this session signed in: owner powers and sensitive account changes depend on both.
    authMethod?: string;
    authAt?: number;
  }
}
declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
    tokenVersion?: number;
    authMethod?: string;
    authAt?: number;
  }
}

// Optional extra restriction on top of the access code: when ALLOWED_EMAILS is set, only those e-mails get in.
export function isAllowed(email?: string | null) {
  if (!email) return false;
  const allowed = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return allowed.length === 0 || allowed.includes(email.toLowerCase());
}

// Right password, address never confirmed. Thrown only after the password matched, so the hint
// reaches the account's owner and nobody else; the login form offers to resend the link.
class UnverifiedEmail extends CredentialsSignin {
  code = "unverified";
}

// Dev-only e-mail login (no password) so the app can be driven without Google. Never registered in a production build.
const devLogin = process.env.NODE_ENV === "development";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      id: "password",
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!z.email().safeParse(email).success || !password || !isAllowed(email))
          return null;
        // Enforced here, not in the form action, so a direct hit on /api/auth/* is limited too.
        const ip = await clientIp();
        if (!(await hit(`login:${email}`, 8, 900)) || !(await hit(`login-ip:${ip}`, 30, 900)))
          return null;
        const row = await prisma.user.findUnique({
          where: { email },
          select: { id: true, passwordHash: true, emailVerifiedAt: true },
        });
        if (!(await verifyPassword(password, row?.passwordHash)) || !row) return null;
        if (!row.emailVerifiedAt) throw new UnverifiedEmail();
        return { id: row.id, email };
      },
    }),
    ...(devLogin
      ? [
          Credentials({
            id: "dev",
            credentials: { email: {} },
            authorize: async (credentials) => {
              const email = String(credentials?.email ?? "")
                .trim()
                .toLowerCase();
              return z.email().safeParse(email).success && isAllowed(email)
                ? { id: email, email }
                : null;
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ account, profile, user }) {
      // The access code guards every entry point, including a direct hit on /api/auth/*.
      if (!(await hasPass())) return false;
      if (account?.provider === "google") {
        if (profile?.email_verified !== true || !isAllowed(profile.email)) return false;
        // An address already bound to another Google account is not taken over by this one.
        const bound = await prisma.user.findUnique({ where: { email: profile.email!.toLowerCase() }, select: { googleSub: true } });
        const subOwner = await prisma.user.findUnique({ where: { googleSub: account.providerAccountId }, select: { id: true } });
        return !bound?.googleSub || bound.googleSub === account.providerAccountId || subOwner !== null;
      }
      return (devLogin || account?.provider === "password") && isAllowed(user.email);
    },
    async jwt({ token, user, account }) {
      if (user?.email) {
        const row = await registerSignIn(
          { email: user.email, name: user.name, image: user.image },
          (await cookies()).get(REFERRAL_COOKIE)?.value,
          account?.provider === "google" ? account.providerAccountId : undefined,
        );
        token.uid = row.id;
        token.tokenVersion = row.tokenVersion;
        token.authMethod = account?.provider;
        token.authAt = Date.now();
        return token;
      }
      if (!token.uid) return null;
      const current = await prisma.user.findUnique({
        where: { id: token.uid },
        select: { tokenVersion: true },
      });
      if (!current || current.tokenVersion !== (token.tokenVersion ?? 0))
        return null;
      return token;
    },
    async session({ session, token }) {
      if (token.uid) session.user.id = token.uid;
      session.authMethod = token.authMethod;
      session.authAt = token.authAt;
      return session;
    },
  },
});
