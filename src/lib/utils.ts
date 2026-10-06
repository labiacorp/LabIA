import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The custom type scale (tailwind.config.ts fontSize) must be known to tailwind-merge, otherwise it reads
// `text-caption` as a color and drops it next to `text-lab-text`.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["eyebrow", "caption", "body-sm", "body", "h3", "h2", "h1", "h1-lg", "display", "cost-lg"] }] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
