import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { cookies } from "next/headers";
import { registerSignIn, REFERRAL_COOKIE } from "@/lib/referrals";
import { CONSENT_COOKIE, CURRENT_TERMS_VERSION } from "@/lib/consent";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { clearHits, clientIp, hit } from "@/lib/rate-limit";

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

// Open to everyone by default. LABIA_CLOSED=1 closes production to the public: only owner accounts (granted
// with scripts/owner.ts) sign in, on any provider, and nobody else can sign in or create an account.
export const ownersOnly = () => process.env.NODE_ENV === "production" && process.env.LABIA_CLOSED === "1";
// What the public pages read to decide whether to offer sign-in at all: the same rule, never a copy of it.
export const accessOpen = () => !ownersOnly();
async function isOwnerAccount(email?: string | null, googleSub?: string) {
  if (!email) return false;
  const owner = await prisma.user.findFirst({
    where: { role: "OWNER", OR: [{ email: email.toLowerCase() }, ...(googleSub ? [{ googleSub }] : [])] },
    select: { id: true },
  });
  return owner !== null;
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
        if (!z.email().safeParse(email).success || !password)
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
        await clearHits(`login:${email}`);
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
              return z.email().safeParse(email).success
                ? { id: email, email }
                : null;
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ account, profile, user }) {
      if (ownersOnly()) {
        const google = account?.provider === "google";
        if (google && profile?.email_verified !== true) return false;
        return isOwnerAccount(google ? profile?.email : user.email, google ? account.providerAccountId : undefined);
      }
      // Open sign-in: the same rules for everyone (no access code, invite or e-mail list).
      if (account?.provider === "google") {
        if (profile?.email_verified !== true) return false;
        // An address already bound to another Google account is not taken over by this one.
        const bound = await prisma.user.findUnique({ where: { email: profile.email!.toLowerCase() }, select: { googleSub: true } });
        const subOwner = await prisma.user.findUnique({ where: { googleSub: account.providerAccountId }, select: { id: true } });
        return !bound?.googleSub || bound.googleSub === account.providerAccountId || subOwner !== null;
      }
      return devLogin || account?.provider === "password";
    },
    async jwt({ token, user, account }) {
      if (user?.email) {
        const jar = await cookies();
        const consented = account?.provider === "google" && jar.get(CONSENT_COOKIE)?.value === CURRENT_TERMS_VERSION;
        const row = await registerSignIn(
          { email: user.email, name: user.name, image: user.image },
          jar.get(REFERRAL_COOKIE)?.value,
          account?.provider === "google" ? account.providerAccountId : undefined,
          consented,
        );
        // The tick is single use: a later Google sign-in must tick again.
        if (consented) jar.delete(CONSENT_COOKIE);
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
