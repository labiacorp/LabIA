import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn("animate-lab-shimmer rounded-control bg-[linear-gradient(90deg,var(--lab-surface-2),var(--lab-border),var(--lab-surface-2))] bg-[length:200%_100%]", className)} {...props} />;
}
export function PageSkeleton({ label = "Carregando o laboratório…" }: { label?: string }) {
  return <main aria-busy="true" aria-label={label} className="mx-auto w-full max-w-[1216px] px-5 py-8 lg:px-8 lg:py-10">
    <span className="sr-only" role="status">{label}</span>
    <Skeleton className="mb-3 h-10 w-48" /><Skeleton className="mb-8 h-4 w-64" />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({length: 8}, (_, i) => <div key={i} className="overflow-hidden rounded-lab border border-lab-border bg-lab-surface-1">
        <Skeleton className="aspect-[16/10] rounded-none" />
        <div className="space-y-3 p-4"><Skeleton className="h-4 w-4/5" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-5 w-16 rounded-full" /></div>
      </div>)}
    </div>
  </main>;
}
