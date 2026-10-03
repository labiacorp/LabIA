import { ProviderConnectionsPanel } from "@/components/providers/provider-connections-panel";

export default function ConnectionsPage() {
  return (
    <main className="mx-auto flex w-full max-w-[800px] flex-1 flex-col gap-6 px-5 py-5 sm:py-10">
      <div>
        <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] sm:text-[32px]">Conexões</h1>
        <p className="mt-1.5 text-sm text-lab-text-dim">Contas e máquinas que o LabIA usa para gerar.</p>
      </div>
      <ProviderConnectionsPanel />
    </main>
  );
}
