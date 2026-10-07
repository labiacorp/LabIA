import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { NetworkId } from "@/lib/social/networks";

// Brand marks as inline SVG (24x24) on the brand's own tile color. These colors belong to the networks,
// not to the LabIA tokens, so they stay constants here. X follows the theme (inverted tile).
type Mark = { tile: string; style?: React.CSSProperties; svg: ReactNode };

const white = { fill: "#fff" } as const;

const MARKS: Record<NetworkId, Mark> = {
  X: {
    tile: "bg-lab-text text-lab-bg",
    svg: <path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />,
  },
  INSTAGRAM: {
    tile: "",
    style: { background: "linear-gradient(45deg, #F9CE34 0%, #EE2A7B 50%, #6228D7 100%)" },
    svg: (
      <g fill="none" stroke="#fff" strokeWidth="2">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="0.6" fill="#fff" />
      </g>
    ),
  },
  TIKTOK: {
    tile: "bg-black",
    svg: <path {...white} d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.7 5.7 0 1 0 4.9 5.7V9a7.4 7.4 0 0 0 4.3 1.4V7.3a4.3 4.3 0 0 1-3.2-1.5z" />,
  },
  LINKEDIN: {
    tile: "bg-[#0A66C2]",
    svg: <path {...white} d="M4.5 9h3.8v11H4.5zM6.4 3.5a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zM10.5 9h3.6v1.5c.5-.9 1.8-1.8 3.7-1.8 3.9 0 4.7 2.5 4.7 5.8V20h-3.8v-5c0-1.2 0-2.7-1.7-2.7s-1.9 1.3-1.9 2.6V20h-3.8z" />,
  },
  THREADS: {
    tile: "bg-black",
    svg: (
      <path
        fill="none"
        stroke="#fff"
        strokeWidth="1.9"
        strokeLinecap="round"
        d="M17.2 8.6C16.4 6 14.6 4.7 12 4.7c-3.4 0-5.5 2.6-5.5 7.3s2.1 7.3 5.5 7.3c2.7 0 4.5-1.4 4.5-3.5 0-2.4-2.3-3.2-4.4-3.2-1.7 0-2.8.8-2.8 1.9 0 1.1.9 1.8 2.3 1.8 2.2 0 3.4-1.6 3.4-4.5 0-2.3-1.2-3.6-3.3-3.6"
      />
    ),
  },
  YOUTUBE: {
    tile: "bg-[#FF0000]",
    svg: (
      <>
        <rect x="2" y="5.5" width="20" height="13" rx="4" fill="#fff" />
        <path fill="#FF0000" d="M10 9v6l5.2-3z" />
      </>
    ),
  },
  FACEBOOK: {
    tile: "bg-[#1877F2]",
    svg: <path {...white} d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.7c0-.9.3-1.5 1.5-1.5h1.5V4.5c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.3H8v3h2.6V21z" />,
  },
  BLUESKY: {
    tile: "bg-[#1185FE]",
    svg: <path {...white} d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z" />,
  },
};

export function NetworkLogo({ id, className }: { id: NetworkId; className?: string }) {
  const mark = MARKS[id];
  return (
    <span
      aria-hidden
      data-logo={id}
      style={mark.style}
      className={cn("flex size-12 shrink-0 items-center justify-center rounded-control ring-1 ring-inset ring-white/10", mark.tile, className)}
    >
      <svg viewBox="0 0 24 24" className="size-[55%]">
        {mark.svg}
      </svg>
    </span>
  );
}
