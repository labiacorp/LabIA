# LabIA — Mapa de aplicação (proposta v2 · 2026-10-02)

> Tudo aqui é **proposta**. Tokens/regras só entram após ok do Felipe, em commit próprio com justificativa (regra do `docs/DESIGN-SYSTEM.md`).
> Referência visual: `LabIA Design System.dc.html` (tokens + componentes) e `LabIA Telas.dc.html` (telas 1440/375 + estados).

## Ordem sugerida de commits
1. `tokens: v2` — `handoff/globals.css` → `app/globals.css`; `handoff/tailwind.config.ts` → `tailwind.config.ts`. Sem mudança visual além de muted, grade do canvas e porta ociosa.
2. `ui: button/badge/cost-chip` — troca `<Badge variant="cost">` por `<CostChip>` em todo o app; remove `text-[10px]`/`text-[11px]` → `text-eyebrow`/`text-caption`.
3. `fix: custo honesto` — `R$0` em falha vira `indisponível`; `~R$0,00` inicial vira `A calcular`; US$ → R$ no nó; `ok` → `✓`.
4. `app: loading/error` — `loading.tsx` + `error.tsx` por rota; remover `.catch(() => [])` que mascara erro como vazio.
5. Telas, uma por commit, na ordem da tabela.

## Componentes
| Componente | Arquivo novo/alterado | Substitui | Status |
|---|---|---|---|
| Tokens CSS | `app/globals.css` | idem | ALTERADO |
| Tailwind | `tailwind.config.ts` | idem | ALTERADO |
| Button (primary/secondary/ghost/danger/link · sm/md/lg/icon) | `components/ui/button.tsx` | idem (`default` → `primary`) | ALTERADO |
| Badge / Status | `components/ui/badge.tsx` | idem | ALTERADO |
| Chip de custo | `components/ui/cost-chip.tsx` | `Badge variant="cost"` + textos `custo R$0…` em `lab-flow-node.tsx` | NOVO |
| Input / Select / Textarea / Field | `components/ui/field.tsx` | classes repetidas em `lab-flow-node.tsx`, `project-onboarding.tsx` | NOVO |
| Card de fluxo | `components/flows/flow-card.tsx` | cards inline em `app/(studio)/fluxos/page.tsx` e `components/home/painel-section.tsx` | NOVO |
| Card de projeto | `components/projects/project-card.tsx` | cards inline em `app/(studio)/projetos/page.tsx` | NOVO |
| Card de asset | `components/library/asset-card.tsx` | cards em `app/(studio)/biblioteca/page.tsx` | NOVO |
| Casca de estado do nó | `components/nodes/lab-node-shell.tsx` | wrapper de `LabFlowNodeComponent` | NOVO |
| Nó (corpo) | `components/nodes/lab-flow-node.tsx` | idem — rótulos PT-BR, R$, sem ID cru | ALTERADO |
| Menu Criar | `components/flows/create-node-menu.tsx` | menu inline em `flow-canvas.tsx` | NOVO (extração) |
| Picker de porta (proposta) | `components/flows/port-picker.tsx` | — | NOVO · proposta |
| Aviso de conexão inválida | `components/flows/invalid-edge-hint.tsx` | — | NOVO |
| Modal de custo | `components/flows/video-cost-confirm-modal.tsx` | idem — renomear para `cost-confirm-modal.tsx`, todos os nós pagos, tipo em PT-BR | ALTERADO |
| Toast / Alerta | `components/ui/toast.tsx`, `components/ui/alert.tsx` | mensagens inline `text-red-300` | NOVO |
| Estado vazio | `components/ui/empty-state.tsx` | vazios genéricos | NOVO |
| Skeleton | `components/ui/skeleton.tsx` | — (páginas em branco) | NOVO |
| Estado de erro | `components/ui/error-state.tsx` | padrão de `project-workspace.tsx` extraído | NOVO |
| Menu de perfil | `components/app/profile-menu.tsx` | `div` decorativo em `app-shell.tsx:80` | NOVO · depende de 10-contas |
| Header desktop + sheet celular | `components/app/app-shell.tsx` (+ `mobile-nav-sheet.tsx`) | idem | ALTERADO |

## Telas
| Tela | Arquivo(s) | Estados a criar |
|---|---|---|
| 0 · App shell | `components/app/app-shell.tsx`, `app/layout.tsx` (custo do mês: `null` em falha) | custo indisponível, sheet celular |
| 1 · Painel (logado) | `app/page.tsx` → `components/home/painel-section.tsx` | carregando, vazio (receita), erro |
| 1 · Landing (deslogado) — proposta | `app/(public)/page.tsx`, `components/landing/*` | poster sem JS, reduced-motion |
| 2 · Criar | `app/(studio)/criar/page.tsx`, `components/create/create-workspace.tsx` | selecionado, criando, erro preservando campos |
| 3 · Fluxos | `app/(studio)/fluxos/page.tsx` + `loading.tsx` + `error.tsx` | carregando, vazio, erro |
| 4 · Canvas | `app/(studio)/fluxos/flow-canvas.tsx`, `lab-flow-node.tsx`, `cost-confirm-modal.tsx` | preparando, vazio com receita, erro, modo leitura celular (proposta) |
| 5 · Projetos | `app/(studio)/projetos/page.tsx`; form → reutilizar `create-workspace.tsx` | carregando, vazio, erro |
| 6 · Projeto | `components/projects/project-workspace.tsx`, `project-assets-panel.tsx` | upload enviando/erro/tipo não aceito |
| 7 · Biblioteca | `app/(studio)/biblioteca/page.tsx` (+ `library-filters-sheet.tsx`, `asset-detail.tsx` proposta) | carregando, vazio, filtro sem resultado, erro |
| 8 · Conexões | `app/(studio)/conexoes/page.tsx`, `components/providers/provider-connections-panel.tsx` | conectado/desconectado/expirado/erro, executor offline |
| B7 · Entrar | `app/(auth)/entrar/page.tsx` — proposta | erro, bloqueio 15 min, não confirmado, navegador interno, carregando |
| B7 · Criar conta | `app/(auth)/criar-conta/page.tsx` — proposta | convite inválido/vencido/usado, código 6 dígitos |
| B7 · Só por convite | `app/(auth)/sem-convite/page.tsx` — proposta | — |
| B7 · Aceite de Termos | `app/(auth)/termos/page.tsx` — proposta | — |

## Copy — trocas obrigatórias
- `Asset source` → **Imagem-base** · `reference` → **Referência** · `Source · cmur5q…` → nome do arquivo + miniatura
- `Entrada legada (Avançado)` → **Usar link de imagem (avançado)**
- `fal / fal-ai/wan-25-preview/image-to-video` → **Wan 2.5 · fal.ai**
- `custo pendente` (importado) → **R$0,00**
- `Criar Projeto e abrir Projeto` → **Criar Projeto**
- `not_configured` / `DATABASE_URL` / `TTL` → "Detalhes técnicos" recolhido (proposta)
- `R$ 0,41 ok` → **R$0,41 ✓**
