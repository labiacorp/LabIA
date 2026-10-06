import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";
export { Input } from "@/components/ui/input";

const fieldClass = "w-full rounded-control border-[1.5px] border-lab-border-strong bg-lab-surface-2 px-4 text-body text-lab-text transition-colors placeholder:text-lab-text-muted focus:border-lab-text focus:outline-none focus:shadow-lab-focus disabled:cursor-not-allowed disabled:bg-lab-surface-1 disabled:text-lab-text-disabled aria-[invalid=true]:border-lab-danger";
export const Select = forwardRef<HTMLSelectElement, ComponentProps<"select">>(({className, ...props}, ref) => <select ref={ref} className={cn(fieldClass,"h-13",className)} {...props} />);
Select.displayName = "Select";
export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(({className, ...props}, ref) => <textarea ref={ref} className={cn(fieldClass,"min-h-24 resize-y py-3 leading-6",className)} {...props} />);
Textarea.displayName = "Textarea";
export function Field({label, htmlFor, description, error, children}: {label:string;htmlFor:string;description?:string;error?:string;children:ReactNode}) {
  return <div className="grid gap-1.5"><label htmlFor={htmlFor} className="text-body-sm font-medium">{label}</label>{children}{error || description ? <p id={`${htmlFor}-description`} className={cn("text-caption",error ? "text-lab-danger" : "text-lab-text-dim")}>{error ?? description}</p> : null}</div>;
}
