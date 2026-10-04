import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { hasPass } from "@/lib/access";
import { prisma } from "@/lib/prisma";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}
declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
  }
}

// Optional extra restriction on top of the access code: when ALLOWED_EMAILS is set, only those e-mails get in.
function isAllowed(email?: string | null) {
  if (!email) return false;
  const allowed = (process.env.ALLOWED_EMAILS ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  return allowed.length === 0 || allowed.includes(email.toLowerCase());
}

// Dev-only e-mail login so the app can be driven without Google. Never registered in a production build.
const devLogin = process.env.NODE_ENV === "development";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }),
    ...(devLogin
      ? [
          Credentials({
            id: "dev",
            credentials: { email: {} },
            authorize: async (credentials) => {
              const email = String(credentials?.email ?? "").trim().toLowerCase();
              return isAllowed(email) ? { id: email, email } : null;
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ account, profile, user }) {
      // The access code guards every entry point, including a direct hit on /api/auth/*.
      if (!(await hasPass())) return false;
      if (account?.provider === "google") return profile?.email_verified === true && isAllowed(profile.email);
      return devLogin && isAllowed(user.email);
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const email = user.email.toLowerCase();
        const row = await prisma.user.upsert({
          where: { email },
          // Keep the display name edited in My Account on subsequent sign-ins.
          update: { image: user.image ?? undefined },
          create: { email, name: user.name, image: user.image },
        });
        token.uid = row.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid) session.user.id = token.uid;
      return session;
    },
  },
});
