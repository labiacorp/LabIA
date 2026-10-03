import Link from "next/link";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-[100dvh] flex-col bg-lab-bg md:items-center md:justify-center md:px-6 md:py-24" style={{ backgroundImage: "radial-gradient(var(--lab-surface-2) 1px, transparent 1px)", backgroundSize: "16px 16px" }}>
      <div className="flex h-header shrink-0 items-center border-b border-lab-border bg-lab-bg px-5 md:absolute md:left-8 md:top-6 md:h-auto md:border-0 md:bg-transparent md:p-0">
        <Link href="/" aria-label="LabIA, início" className="lab-wordmark rounded-control focus-visible:outline-none focus-visible:shadow-lab-focus md:text-[22px]">Lab<span>IA</span></Link>
      </div>
      <div className="w-full bg-lab-bg p-5 md:max-w-[466px] md:rounded-lab md:border md:border-lab-border md:bg-lab-surface-1 md:p-8">{children}</div>
    </main>
  );
}
