import type { Metadata } from "next";
import { Big_Shoulders, Geist, Geist_Mono } from "next/font/google";

import { PostHogProvider } from "@/components/app/posthog-provider";
import "./globals.css";

const display = Big_Shoulders({ subsets: ["latin"], variable: "--font-display" });
const ui = Geist({ subsets: ["latin"], variable: "--font-ui" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = { title: "LabIA", description: "Esteira de conteúdo para influencers de IA." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="dark" className="dark">
      <body className={`${display.variable} ${ui.variable} ${mono.variable}`}><PostHogProvider />{children}</body>
    </html>
  );
}
