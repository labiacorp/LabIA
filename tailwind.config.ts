// LabIA — tailwind v2 (PROPOSTA · 2026-10-02). Só aplicar após ok do Felipe.
import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        lab: {
          bg: "var(--lab-bg)",
          "surface-1": "var(--lab-surface-1)",
          "surface-2": "var(--lab-surface-2)",
          border: "var(--lab-border)",
          "border-strong": "var(--lab-border-strong)",
          text: "var(--lab-text)",
          "text-dim": "var(--lab-text-dim)",
          "text-muted": "var(--lab-text-muted)",
          "text-disabled": "var(--lab-text-disabled)", // NOVO
          reagent: "var(--lab-reagent)",
          "reagent-bright": "var(--lab-reagent-bright)",
          "reagent-dim": "var(--lab-reagent-dim)",
          "reagent-line": "var(--lab-reagent-line)", // NOVO
          "on-reagent": "var(--lab-on-reagent)", // NOVO
          success: "var(--lab-success)",
          warning: "var(--lab-warning)",
          danger: "var(--lab-danger)",
          info: "var(--lab-info)",
          "success-dim": "var(--lab-success-dim)", // NOVO
          "warning-dim": "var(--lab-warning-dim)", // NOVO
          "danger-dim": "var(--lab-danger-dim)", // NOVO
          "info-dim": "var(--lab-info-dim)", // NOVO
          "danger-line": "var(--lab-danger-line)", // NOVO
          "warning-line": "var(--lab-warning-line)", // NOVO
          scrim: "var(--lab-scrim)", // NOVO
          node: { // NOVO (antes só via var() inline)
            image: "var(--lab-node-image)", video: "var(--lab-node-video)", copy: "var(--lab-node-copy)",
            design: "var(--lab-node-design)", publish: "var(--lab-node-publish)", utility: "var(--lab-node-utility)",
          },
          ctx: { // NOVO
            create: "var(--lab-ctx-create)", project: "var(--lab-ctx-project)",
            post: "var(--lab-ctx-post)", direction: "var(--lab-ctx-direction)",
          },
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-ui)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      // NOVO · escala fixa — substitui text-[10px], text-[11px] e trackings soltos
      fontSize: {
        eyebrow: ["11px", { lineHeight: "16px", letterSpacing: "0.08em", fontWeight: "500" }], // mono, uppercase
        caption: ["12px", { lineHeight: "16px" }],
        "body-sm": ["14px", { lineHeight: "20px" }],
        body: ["16px", { lineHeight: "24px" }],
        h3: ["18px", { lineHeight: "24px", fontWeight: "500" }],
        h2: ["30px", { lineHeight: "30px", fontWeight: "900" }],
        h1: ["clamp(40px,7vw,56px)", { lineHeight: "0.9", fontWeight: "900" }],
        "h1-lg": ["40px", { lineHeight: "48px", fontWeight: "700", letterSpacing: "-0.02em" }],
        display: ["64px", { lineHeight: "64px", fontWeight: "700", letterSpacing: "-0.03em" }],
        "cost-lg": ["28px", { lineHeight: "32px", fontWeight: "600" }], // mono
      },
      // espaçamento: usar a escala padrão (1=4 · 2=8 · 3=12 · 4=16 · 6=24 · 8=32 · 12=48 · 16=64); não criar valores fora dela
      maxWidth: { form: "var(--lab-w-form)", content: "var(--lab-w-content)", wide: "var(--lab-w-wide)" }, // NOVO
      height: { header: "56px", toolbar: "48px" }, // NOVO (h-14 / h-12 nomeados)
      borderRadius: { lab: "20px", control: "12px", card: "20px", sheet: "28px" }, // MANTIDO
      boxShadow: {
        "lab-focus": "0 0 0 1px var(--lab-reagent), 0 0 24px var(--lab-reagent-dim)", // MANTIDO
        "lab-danger": "0 0 0 1px var(--lab-danger), 0 0 24px var(--lab-danger-dim)", // NOVO
        "lab-popover": "var(--lab-shadow-popover)", // NOVO
        "lab-modal": "var(--lab-shadow-modal)", // NOVO
      },
      zIndex: { canvas: "0", "canvas-ui": "10", landing: "30", menu: "35", header: "40", modal: "50", toast: "60" }, // NOVO
      transitionDuration: { micro: "120ms", panel: "200ms" }, // NOVO
      transitionTimingFunction: { lab: "cubic-bezier(0.2, 0, 0, 1)" }, // NOVO
      keyframes: {
        "lab-pulse": {
          "0%,100%": { boxShadow: "0 0 0 1px var(--lab-reagent), 0 0 0 0 var(--lab-reagent-dim)" },
          "50%": { boxShadow: "0 0 0 1px var(--lab-reagent), 0 0 24px 2px var(--lab-reagent-dim)" },
        },
        "lab-shimmer": { from: { backgroundPosition: "-200% 0" }, to: { backgroundPosition: "200% 0" } },
      },
      animation: {
        "lab-pulse": "lab-pulse 1600ms ease-in-out infinite", // NOVO · nó rodando
        "lab-shimmer": "lab-shimmer 1.6s linear infinite", // NOVO · skeleton
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
