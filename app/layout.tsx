import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "@xyflow/react/dist/style.css";
import "./globals.css";

import { AppShell } from "@/components/app/app-shell";
import { getSessionPrincipal } from "@/lib/auth/session";
import { hasDatabaseEnv } from "@/lib/db/env";
import { getCurrentMonthSpendBrl } from "@/lib/db/flows";
import { formatBrl } from "@/lib/format";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "LabIA",
  description: "Canvas de fluxos para produção social com IA.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const principal = await getSessionPrincipal().catch(() => null);
  const monthSpend = principal?.workspace && hasDatabaseEnv()
    ? await getCurrentMonthSpendBrl(principal.workspace.id).catch(() => null)
    : null;

  return (
    <html lang="pt-BR" className="dark" data-scroll-behavior="smooth">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetBrainsMono.variable}`}
      >
        <AppShell
          account={principal ? { name: principal.name, email: principal.email, workspaceName: principal.workspace?.name ?? null, isAdmin: principal.isAdmin } : null}
          monthCostLabel={monthSpend === null ? null : formatBrl(monthSpend).replace(/\s/g, "")}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
