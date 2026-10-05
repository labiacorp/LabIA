"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

function subscribe(callback: () => void) {
  window.addEventListener("labia-theme-change", callback);
  return () => window.removeEventListener("labia-theme-change", callback);
}

export function ThemeToggle() {
  const light = useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme === "light", () => false);
  return (
    <button type="button" className="shell-theme" aria-label={light ? "Ativar tema escuro" : "Ativar tema claro"} title={light ? "Tema escuro" : "Tema claro"} onClick={() => {
      const theme = light ? "dark" : "light";
      document.documentElement.dataset.theme = theme;
      document.documentElement.classList.toggle("dark", theme === "dark");
      try { localStorage.setItem("labia-theme", theme); } catch { /* The theme still works when browser storage is unavailable. */ }
      window.dispatchEvent(new Event("labia-theme-change"));
    }}>
      {light ? <Moon className="size-4" aria-hidden /> : <Sun className="size-4" aria-hidden />}
    </button>
  );
}
