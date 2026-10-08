import type { ReactNode } from "react";
import { CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
const variants = {
  success: {Icon:CircleCheck, icon:"text-lab-success", frame:"border-lab-border-strong bg-lab-surface-1"},
  warning: {Icon:TriangleAlert, icon:"text-lab-warning", frame:"border-lab-warning-line bg-lab-warning-dim"},
  error: {Icon:CircleX, icon:"text-lab-danger", frame:"border-lab-danger-line bg-lab-danger-dim"},
  info: {Icon:Info, icon:"text-lab-info", frame:"border-lab-border-strong bg-lab-surface-1"},
};
// compact: one inline line for step screens, so a warning does not take the stage over.
export function Alert({variant="info",title,children,action,compact}: {variant?:keyof typeof variants;title:string;children?:ReactNode;action?:ReactNode;compact?:boolean}) {
  const {Icon,icon,frame}=variants[variant];
  return <div role={variant === "error" ? "alert" : "status"} className={cn("flex items-start gap-2 rounded-lg border-[1.5px]",compact ? "px-3 py-2" : "p-3.5",frame)}>
    <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0",icon)} />
    <div className="min-w-0 flex-1"><p className={cn(compact ? "text-caption" : "text-body-sm", "font-medium")}>{title}</p>{children ? <div className="mt-0.5 text-caption leading-[18px] text-lab-text-dim">{children}</div> : null}</div>{action}
  </div>;
}
