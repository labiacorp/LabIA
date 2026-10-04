# Primary influencer studio

Diego requested a close implementation of the [Higgsfield AI Influencer Studio](https://higgsfield.ai/ai-influencer-studio) on 2026-10-03, delivered through a task branch and a PR targeting `v2`. This is the main LabIA tool, not a research-only deliverable.

## Public reference observations

Inspected without authentication through the rendered browser UI. The server-rendered page alone omits the interactive builder.

- Two creation modes: character builder and motion.
- Character controls: 19 groups, 173 options; optional photo input, randomization, generation.
- Groups cover character type, gender, build, hair, style, origin, age, skin, height, proportions, head, neck, eyes, facial traits, facial hair, distinctive traits and accessories.
- Exploration/history, character presets, vendor presets and community trends.
- Cards expose sheet previews and recreation. The preview combines an image and appearance parameters.
- Motion offers transfer and object replacement, 4–30s reference video, up to 30 reference images, optional prompt, and quality selection. Its visible model label is Genjutsu; default quality is 720p.

Not verified: paid outputs, prices, authenticated history, character-generation model, or all preset availability. No generation was submitted.

## LabIA implementation

The home now mirrors the studio composition: sticky settings panel, segmented creation modes, headline, exploration/history, portrait cards, sheet dialog and preset reuse. It retains LabIA tokens and PT-BR copy.

The 19 appearance groups (with multiple selection for combinable traits) feed a validated English appearance description stored in `Influencer.persona`. The user's visual signature remains separate. Creating a character is free; the next screen quotes the existing character kit before paid submission. Presets are editable briefs, not identity clones.

The six gallery images are public Higgsfield preview URLs observed on the reference page. They are attributed in the interface and are never stored as user assets or presented as LabIA-generated outputs. These external previews depend on the source remaining available. Replace them with approved LabIA media when that library exists.

Movement uses the existing V2 pipeline: select an owned character with a face, choose movement, author a scene, and create a free draft. Paid IMAGE/VIDEO approvals happen on the content page. Reference-video transfer, object swapping and photo upload need separate provider/storage work; the interface does not claim they run here.

History and the owned-character gallery use account-scoped database queries. No schema change, paid generation, top-up or deployment is part of this task.

## Verification and GitHub

Local validation uses a disposable QA user and `FAL_MOCK=1`. GitHub CI runs typecheck, lint, unit/mocked-provider tests and build without real credentials. Database integration tests run against the configured Neon database locally with their own disposable users; they are intentionally excluded from the untrusted fork CI job.

The current GitHub credential has read-only access to `labiacorp/LabIA`. Delivery uses `useleaner/LabIA:diego/influencer-studio` with a PR targeting `labiacorp/LabIA:v2`; no direct working-branch push or merge.
