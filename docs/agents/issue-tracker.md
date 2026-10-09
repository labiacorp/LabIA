# Issue tracker: TASKS.md and Notion

TASKS.md is the repository's implementation queue. Notion holds the
corresponding task records for founder tracking.

## Workflow

- Read TASKS.md and the relevant existing Notion task before changing them.
- Find existing tasks by their identifier, title, branch or commit.
- Record scope, ownership, blockers and implementation evidence in TASKS.md.
- Keep the corresponding Notion task consistent within authorized work.
- Preserve existing Notion properties and status values.
- If Notion is unavailable, finish the authorized local work and report
  the pending Notion update explicitly.
- Report conflicting records before changing their meaning.
- Do not create duplicate GitHub issues or a separate local task queue.

## Skill terminology

"Publish to the issue tracker" means record the task in TASKS.md and update
its corresponding Notion record within the authorized scope.

"Fetch the relevant ticket" means read the TASKS.md entry and its
corresponding Notion record.

This setup does not authorize bulk synchronization or new Notion fields.

PRs as a request surface: no.
