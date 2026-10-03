// LabIA · tokens v2 do Claude Design.
import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        lab: {
          bg: "rgb(var(--lab-bg-rgb) / <alpha-value>)",
          "surface-1": "rgb(var(--lab-surface-1-rgb) / <alpha-value>)",
          "surface-2": "rgb(var(--lab-surface-2-rgb) / <alpha-value>)",
          border: "rgb(var(--lab-border-rgb) / <alpha-value>)",
          "border-strong": "rgb(var(--lab-border-strong-rgb) / <alpha-value>)",
          text: "rgb(var(--lab-text-rgb) / <alpha-value>)",
          "text-dim": "rgb(var(--lab-text-dim-rgb) / <alpha-value>)",
          "text-muted": "rgb(var(--lab-text-muted-rgb) / <alpha-value>)",
          "text-disabled": "rgb(var(--lab-text-disabled-rgb) / <alpha-value>)", // NOVO
          reagent: "rgb(var(--lab-reagent-rgb) / <alpha-value>)",
          "reagent-bright": "rgb(var(--lab-reagent-bright-rgb) / <alpha-value>)",
          "reagent-dim": "var(--lab-reagent-dim)",
          "reagent-line": "var(--lab-reagent-line)", // NOVO
          "on-reagent": "rgb(var(--lab-on-reagent-rgb) / <alpha-value>)", // NOVO
          success: "rgb(var(--lab-success-rgb) / <alpha-value>)",
          warning: "rgb(var(--lab-warning-rgb) / <alpha-value>)",
          danger: "rgb(var(--lab-danger-rgb) / <alpha-value>)",
          info: "rgb(var(--lab-info-rgb) / <alpha-value>)",
          "success-dim": "var(--lab-success-dim)", // NOVO
          "warning-dim": "var(--lab-warning-dim)", // NOVO
          "danger-dim": "var(--lab-danger-dim)", // NOVO
          "info-dim": "var(--lab-info-dim)", // NOVO
          "danger-line": "var(--lab-danger-line)", // NOVO
          "warning-line": "var(--lab-warning-line)", // NOVO
          scrim: "var(--lab-scrim)", // NOVO
          node: { // NOVO (antes só via var() inline)
            image: "rgb(var(--lab-node-image-rgb) / <alpha-value>)", video: "rgb(var(--lab-node-video-rgb) / <alpha-value>)", copy: "rgb(var(--lab-node-copy-rgb) / <alpha-value>)",
            design: "rgb(var(--lab-node-design-rgb) / <alpha-value>)", publish: "rgb(var(--lab-node-publish-rgb) / <alpha-value>)", utility: "rgb(var(--lab-node-utility-rgb) / <alpha-value>)",
          },
          ctx: { // NOVO
            create: "rgb(var(--lab-ctx-create-rgb) / <alpha-value>)", project: "rgb(var(--lab-ctx-project-rgb) / <alpha-value>)",
            post: "rgb(var(--lab-ctx-post-rgb) / <alpha-value>)", direction: "rgb(var(--lab-ctx-direction-rgb) / <alpha-value>)",
          },
        },
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      // NOVO · escala fixa · substitui text-[10px], text-[11px] e trackings soltos
      fontSize: {
        eyebrow: ["11px", { lineHeight: "16px", letterSpacing: "0.08em", fontWeight: "500" }], // mono, uppercase
        caption: ["12px", { lineHeight: "16px" }],
        "body-sm": ["14px", { lineHeight: "20px" }],
        body: ["16px", { lineHeight: "24px" }],
        h3: ["18px", { lineHeight: "24px", fontWeight: "500" }],
        h2: ["24px", { lineHeight: "32px", fontWeight: "500", letterSpacing: "-0.01em" }],
        h1: ["32px", { lineHeight: "40px", fontWeight: "700", letterSpacing: "-0.02em" }],
        "h1-lg": ["40px", { lineHeight: "48px", fontWeight: "700", letterSpacing: "-0.02em" }],
        display: ["64px", { lineHeight: "64px", fontWeight: "700", letterSpacing: "-0.03em" }],
        "cost-lg": ["28px", { lineHeight: "32px", fontWeight: "600" }], // mono
      },
      // espaçamento: usar a escala padrão (1=4 · 2=8 · 3=12 · 4=16 · 6=24 · 8=32 · 12=48 · 16=64); não criar valores fora dela
      maxWidth: { form: "var(--lab-w-form)", content: "var(--lab-w-content)", wide: "var(--lab-w-wide)" }, // NOVO
      height: { header: "56px", toolbar: "48px" }, // NOVO (h-14 / h-12 nomeados)
      borderRadius: { lab: "12px", control: "8px" }, // MANTIDO
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
