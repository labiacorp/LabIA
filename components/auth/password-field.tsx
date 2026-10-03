"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";

// Campo de senha com "mostrar/ocultar". O botão tem 44px de largura para o toque no celular.
export function PasswordField({ id, ...props }: Omit<ComponentProps<typeof Input>, "type"> & { id: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input id={id} type={visible ? "text" : "password"} className="h-12 pl-3 pr-12 md:h-11" {...props} />
      <button
        type="button"
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
        className="absolute right-0 top-0 flex h-full w-11 items-center justify-center rounded-control text-lab-text-dim focus-visible:outline-none focus-visible:shadow-lab-focus"
      >
        {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
}
