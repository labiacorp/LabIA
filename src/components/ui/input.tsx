import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-control border border-lab-border bg-lab-surface-2 px-3 py-1 text-sm text-lab-text transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-lab-text-muted focus-visible:border-lab-border-strong focus-visible:outline-none focus-visible:shadow-lab-focus aria-[invalid=true]:border-lab-danger disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
