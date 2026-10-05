import NextAuth, { type DefaultSession } from "next-auth";
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
  }
}
declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
    tokenVersion?: number;
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
          select: { id: true, passwordHash: true },
        });
        return (await verifyPassword(password, row?.passwordHash)) && row
          ? { id: row.id, email }
          : null;
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
      if (account?.provider === "google")
        return profile?.email_verified === true && isAllowed(profile.email);
      return (devLogin || account?.provider === "password") && isAllowed(user.email);
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const row = await registerSignIn(
          { email: user.email, name: user.name, image: user.image },
          (await cookies()).get(REFERRAL_COOKIE)?.value,
        );
        token.uid = row.id;
        token.tokenVersion = row.tokenVersion;
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
      return session;
    },
  },
});
