// PROPOSTA v2 — substitui components/ui/button.tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-colors duration-micro ease-lab focus-visible:outline-none focus-visible:shadow-lab-focus disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // primário = único fundo verde da tela (CTA / Executar)
        primary: "bg-lab-text [color:var(--lab-on-reagent)] hover:bg-white",
        // verde = só o que gasta dinheiro (Gerar, confirmar custo)
        cost: "bg-lab-reagent [color:var(--lab-on-reagent)] hover:brightness-95",
        secondary: "border-[1.5px] border-lab-border-strong bg-transparent text-lab-text hover:bg-lab-surface-2",
        ghost: "text-lab-text-dim hover:bg-lab-surface-2 hover:text-lab-text",
        danger: "border border-lab-danger-line bg-lab-danger-dim text-lab-danger hover:bg-lab-danger hover:text-lab-bg",
        link: "h-auto px-0 text-lab-text underline-offset-4 hover:underline", // links comuns NÃO são verdes
      },
      size: {
        sm: "h-9 px-4 text-caption",
        md: "h-10 px-4 text-body-sm",
        lg: "h-12 px-5 text-body",
        icon: "size-11 p-0",
        "icon-lg": "size-12 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
        {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";
export { Button, buttonVariants };
