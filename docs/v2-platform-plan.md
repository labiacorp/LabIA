# V2 platform completion plan

Diego requested an overview before further implementation and then authorized starting this sequence on 2026-10-03. The studio is the primary creation tool within LabIA. The complete application also needs navigation, account management, production management and media management.

## Architecture

Keep the V2 model: Influencer > Content > Steps. Adapt V1's projects and flows to this model, rather than introducing a second parallel production system. The canvas is another view of the same Steps. Reuse V1 UI patterns with the existing design tokens and PT-BR customer copy.

| Block | Outcome | Acceptance |
| --- | --- | --- |
| 1. Shell and account | Dashboard, desktop/mobile navigation, account menu, editable name, owned influencer/content lists, balance and ledger | Every navigation destination works; account isolation and authenticated routes hold; profile update persists; mobile has no horizontal overflow |
| 2. Production management | Influencer and content editing, search, status management and archiving | Users can organize and resume their own work; archive behavior preserves generation and cost records |
| 3. Media and costs | Global library, filters, previews, downloads, asset provenance, content cost reporting | Ownership is enforced; no unknown costs shown as zero; source and cost remain traceable; audio/video/image previews work |
| 4. Finished production | Editable scripts, uploads, durable storage, retries, voice/lip sync and final download | A complete mock production can be exercised, including failures; retries do not charge completed work again |
| 5. Canvas and release readiness | V1 canvas adapted to Steps, compatible provider connections, access and mobile review | Both production views share state; only implemented provider capabilities are offered; V2 uses its own deployment environment |

## Current delivery boundaries

- Block 1 provides searches and status filtering, with an explicit 100-result limit. Editing/archive and full pagination remain in subsequent blocks.
- The studio remains at `/`. The brand link opens `/painel`; all existing studio and production links keep working.
- Libraries inside each character remain available until the global library is delivered.
- Balance/extract is read-only. Credit additions remain team-operated; no payment or top-up action is introduced.
- Each block gets a task branch, checks, browser review and a PR to `v2`. Production `main` remains V1.

## Dependencies

Durable media and uploads need Blob credentials. Voice/lip sync needs the founders' choice from the existing research and an audio input approach. V2 deployment needs its own Vercel environment, OAuth configuration and production database branch. These dependencies do not block the account and management UI.

Development verification uses `FAL_MOCK=1`; no real generations or paid calls. Tests use isolated seeded users and remove them. Real outputs, invoices and face continuity remain unverified until an explicitly authorized real generation.
