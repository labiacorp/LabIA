import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-13 w-full rounded-control border-[1.5px] border-lab-border-strong bg-lab-surface-2 px-4 py-1 text-body text-lab-text transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-lab-text-dim focus-visible:border-lab-text focus-visible:outline-none focus-visible:shadow-lab-focus aria-[invalid=true]:border-lab-danger disabled:cursor-not-allowed disabled:opacity-50",
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
