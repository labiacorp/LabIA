"use client";

import { useEffect, useState } from "react";
import { Toast } from "@/components/ui/toast";

// Shows a stage's "pronto" / "falhou" toast once per take: the key is remembered for the session, so the
// watcher's refreshes and later visits stay quiet. Without storage it shows once per page load.
export function StepToast({ id, tone, title, children }: { id: string; tone: "money" | "error"; title: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { if (sessionStorage.getItem(id)) return; sessionStorage.setItem(id, "1"); } catch { /* storage blocked */ }
    setShow(true); // eslint-disable-line react-hooks/set-state-in-effect -- reads browser-only storage after hydration
  }, [id]);
  return show ? <Toast tone={tone} title={title}>{children}</Toast> : null;
}
