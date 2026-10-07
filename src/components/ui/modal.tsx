"use client";

import type { ReactNode, RefObject } from "react";

// Design modal: bottom sheet with a grab handle on mobile, centred 460px card on desktop (styles in globals.css).
// Native <dialog>: Esc and the backdrop close it, focus is trapped by the browser.
export function Modal({ dialog, label, tone, children }: { dialog: RefObject<HTMLDialogElement | null>; label: string; tone?: "danger"; children: ReactNode }) {
  return <dialog ref={dialog} aria-label={label} data-tone={tone} role={tone === "danger" ? "alertdialog" : undefined} className="lab-modal" onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
    <div className="flex flex-col gap-4">{children}</div>
  </dialog>;
}
