"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { androidBrowserIntentUrl, detectInAppBrowser, type InAppBrowserInfo } from "@/lib/in-app-browser";

// Instagram/TikTok/Facebook webviews break Google sign-in and cannot install anything. Shown only there,
// additive: Android gets a button that hands the page to the real browser, iOS gets a sentence (no API exists).
export function InAppBrowserBar() {
  const [info, setInfo] = useState<InAppBrowserInfo | null>(null);
  useEffect(() => {
    const detected = detectInAppBrowser(navigator.userAgent);
    if (detected.app) setInfo(detected); // eslint-disable-line react-hooks/set-state-in-effect -- UA is only known on the client
  }, []);
  if (!info) return null;
  const box = "flex items-center gap-3 rounded-lab border-[1.5px] border-lab-border-strong bg-lab-surface-1 px-4 py-3 text-body-sm";
  return info.canEscapeProgrammatically
    ? <a href={androidBrowserIntentUrl(window.location.href)} className={`${box} font-medium`}><ExternalLink className="size-4 shrink-0" aria-hidden />Abrir no navegador (o login com Google não funciona aqui)</a>
    : <p role="note" className={box}><ExternalLink className="size-4 shrink-0" aria-hidden /><span>Pra entrar com o Google, abra esta página no Safari ou Chrome: toque em <strong>⋯</strong> e em <strong>Abrir no navegador</strong>.</span></p>;
}
