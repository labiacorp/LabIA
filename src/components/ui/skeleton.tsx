import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn("animate-lab-shimmer rounded-control bg-[linear-gradient(90deg,var(--lab-surface-2),var(--lab-border),var(--lab-surface-2))] bg-[length:200%_100%]", className)} {...props} />;
}
