import type { ReactNode } from "react";
import { Plus, Search, type LucideIcon } from "lucide-react";
import { CostChip } from "@/components/ui/cost-chip";
import type { LabNodeKind } from "@/lib/flows/graph";

export type CreateAction = {
  id: string;
  label: string;
  description: string;
  kind: LabNodeKind;
  icon: LucideIcon;
};

export type CreateMenuContext = "project" | "create" | "post" | "direction" | "neutral";

// Cor de contexto por grupo (tokens --lab-ctx-*). Neutro para "Mais ferramentas".
const ctxColor: Record<CreateMenuContext, string> = {
  project: "var(--lab-ctx-project)",
  create: "var(--lab-ctx-create)",
  post: "var(--lab-ctx-post)",
  direction: "var(--lab-ctx-direction)",
  neutral: "var(--lab-node-utility)",
};

const groupContext: Record<string, CreateMenuContext> = {
  "Entrada do Projeto": "project",
  Criar: "create",
  "Pós-produção": "post",
  Direção: "direction",
};

// Nós que não geram nada via API: custo conhecido R$0,00. Os demais só têm custo depois de configurados.
const freeKinds = new Set<LabNodeKind>(["text-input", "prompt", "note", "asset-input", "asset-output", "video-assembly"]);

export type CreateMenuSection = { label: string; actions: CreateAction[] };

type Props = {
  search: string;
  onSearch: (value: string) => void;
  priorityActions: CreateAction[];
  sections: CreateMenuSection[];
  compatibilityActions: CreateAction[];
  isImporting: boolean;
  onPriority: (action: CreateAction) => void;
  onAdd: (action: CreateAction) => void;
  children?: ReactNode;
};

function CreateActionButton({ action, ctx, onSelect, disabled = false }: { action: CreateAction; ctx: CreateMenuContext; onSelect: (action: CreateAction) => void; disabled?: boolean }) {
  const Icon = action.icon;
  return (
    <button
      type="button"
      data-action={action.id}
      disabled={disabled}
      onClick={() => onSelect(action)}
      className="group flex min-w-0 items-center gap-2.5 rounded-control border border-lab-border bg-lab-surface-2 p-2 text-left transition-colors hover:border-lab-border-strong hover:bg-lab-bg focus-visible:outline-none focus-visible:shadow-lab-focus disabled:cursor-wait disabled:opacity-60"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-control border border-lab-border bg-lab-surface-1" style={{ color: ctxColor[ctx] }}>
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-sm font-medium text-lab-text">{action.label}</span>
        <span className="block truncate text-caption text-lab-text-muted">{action.description}</span>
      </span>
      <CostChip size="sm" state={freeKinds.has(action.kind) ? "free" : "pending"} />
      {action.id !== "project-assets" ? <Plus className="size-4 shrink-0 text-lab-text-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden /> : null}
    </button>
  );
}

function GroupLabel({ label, ctx }: { label: string; ctx: CreateMenuContext }) {
  return (
    <div className="flex items-center gap-2 px-1 pb-1 pt-1 font-mono text-eyebrow uppercase text-lab-text-dim">
      <i aria-hidden className="inline-block size-2 rounded-sm" style={{ background: ctxColor[ctx] }} />
      {label}
    </div>
  );
}

export function CreateNodeMenu({ search, onSearch, priorityActions, sections, compatibilityActions, isImporting, onPriority, onAdd, children }: Props) {
  const empty = priorityActions.length === 0 && sections.length === 0 && compatibilityActions.length === 0;
  return (
    <>
      <label className="sticky top-0 z-10 mb-2 flex shrink-0 items-center gap-2 rounded-control border border-lab-border bg-lab-surface-2 px-2.5 py-2 focus-within:border-lab-border-strong">
        <Search className="size-4 shrink-0 text-lab-text-muted" aria-hidden />
        <span className="sr-only">Buscar ações</span>
        <input
          data-testid="create-search"
          type="search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Buscar ações"
          aria-label="Buscar ações"
          className="min-w-0 flex-1 bg-transparent text-body-sm text-lab-text outline-none placeholder:text-lab-text-muted"
        />
      </label>

      {priorityActions.length > 0 ? (
        <div className="mb-2 border-b border-lab-border pb-2">
          <GroupLabel label="Entrada do Projeto" ctx="project" />
          <div className="grid gap-1.5">
            {priorityActions.map((action) => (
              <CreateActionButton key={action.id} action={action} ctx="project" disabled={action.id === "import-base-image" && isImporting} onSelect={onPriority} />
            ))}
          </div>
        </div>
      ) : null}

      {sections.map((section) => {
        const ctx = groupContext[section.label] ?? "neutral";
        return (
          <div key={section.label} className="mb-2 last:mb-0">
            <GroupLabel label={section.label} ctx={ctx} />
            {section.actions.length > 0 ? (
              <div className="grid gap-1.5">
                {section.actions.map((action) => <CreateActionButton key={action.id} action={action} ctx={ctx} onSelect={onAdd} />)}
              </div>
            ) : (
              <p className="px-1 py-1 text-caption text-lab-text-muted">Production Director · indisponível</p>
            )}
          </div>
        );
      })}

      {compatibilityActions.length > 0 ? (
        <div className="mb-2 last:mb-0">
          <GroupLabel label="Mais ferramentas" ctx="neutral" />
          <div className="grid gap-1.5">
            {compatibilityActions.map((action) => <CreateActionButton key={action.id} action={action} ctx="neutral" onSelect={onAdd} />)}
          </div>
        </div>
      ) : null}

      {empty ? <p className="px-1 py-2 text-caption text-lab-text-muted">Nenhuma ação encontrada.</p> : null}
      {children}
    </>
  );
}
