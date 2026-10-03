"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Asks the server to look at the running jobs every few seconds; reloads the page when none are left.
export function KitWatcher({ influencerId, active }: { influencerId: string; active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const response = await fetch(`/api/influencers/${influencerId}/refresh`, { method: "POST", cache: "no-store" });
        const { running } = (await response.json()) as { running?: number };
        if (stopped) return;
        if (response.ok && running === 0) return router.refresh();
      } catch {
        /* network blip: try again */
      }
      if (!stopped) timer = setTimeout(tick, 3000);
    };
    timer = setTimeout(tick, 2000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [influencerId, active, router]);
  return null;
}
