"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardRetry() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <Button variant="secondary" size="sm" disabled={pending} onClick={() => startTransition(() => router.refresh())}><RotateCcw className={pending ? "animate-spin" : undefined} aria-hidden />{pending ? "Carregando…" : "Tentar de novo"}</Button>;
}
