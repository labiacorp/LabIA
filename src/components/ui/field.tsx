import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";
export { Input } from "@/components/ui/input";

export const fieldClass = "w-full rounded-control border border-lab-border bg-lab-surface-2 px-3 text-body-sm text-lab-text transition-colors placeholder:text-lab-text-muted focus:border-lab-border-strong focus:outline-none focus:shadow-lab-focus disabled:cursor-not-allowed disabled:bg-lab-surface-1 disabled:text-lab-text-disabled aria-[invalid=true]:border-lab-danger";
export const Select = forwardRef<HTMLSelectElement, ComponentProps<"select">>(({className, ...props}, ref) => <select ref={ref} className={cn(fieldClass,"h-9",className)} {...props} />);
Select.displayName = "Select";
export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(({className, ...props}, ref) => <textarea ref={ref} className={cn(fieldClass,"min-h-20 resize-y py-2 font-mono text-caption leading-5",className)} {...props} />);
Textarea.displayName = "Textarea";
export function Field({label, htmlFor, description, error, children}: {label:string;htmlFor:string;description?:string;error?:string;children:ReactNode}) {
  return <div className="grid gap-1.5"><label htmlFor={htmlFor} className="font-mono text-eyebrow uppercase text-lab-text-muted">{label}</label>{children}{error || description ? <p id={`${htmlFor}-description`} className={cn("text-caption",error ? "text-lab-danger" : "text-lab-text-dim")}>{error ?? description}</p> : null}</div>;
}
