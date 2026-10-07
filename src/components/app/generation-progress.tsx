"use client";

import { useEffect, useState } from "react";

// What the user sees while a generation runs. The providers only report queued / running / done (no percentage), so
// the bar is indeterminate and the honest signal is the time since it started; the page refreshes itself when it finishes.
export function GenerationProgress({ since, title, detail }: { since: string; title: string; detail?: string }) {
  const start = new Date(since).getTime();
  const [now, setNow] = useState(start);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.floor((now - start) / 1000));
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return <div role="status" className="flex flex-col gap-3">
    <div className="flex items-baseline justify-between gap-3"><span className="text-body-sm font-medium">{title}</span><span className="font-mono text-body-sm text-lab-text-dim" aria-label={`Running for ${clock}`}>{clock}</span></div>
    <div className="h-2 overflow-hidden rounded bg-lab-surface-3" aria-hidden>
      <div className="h-full w-full animate-lab-shimmer bg-[linear-gradient(90deg,var(--lab-reagent),var(--lab-surface-3),var(--lab-reagent))] bg-[length:200%_100%]" />
    </div>
    <p className="text-caption text-lab-text-dim">{detail ?? "The provider does not report a percentage, so the bar only shows it is running. You can leave this page and come back; the request is saved."}</p>
  </div>;
}
