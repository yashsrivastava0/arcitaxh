---
description: Refresh docs/05-phases/phase-0/status.md from the repo's actual state
---

Update `docs/05-phases/phase-0/status.md`.

1. Check what exists: which scripts are in the root `package.json`, which packages exist, `git log --oneline -20`, `git status`.
2. Run `pnpm ci` if it exists and note the result honestly (what failed, with the output). Do not claim a milestone is done unless its acceptance criteria in the brief (section 17) pass.
3. Update the milestone table, "where we are", "next", blockers and environment notes. Keep `docs/05-phases/phase-0/questions.md` in step.
4. Set `updated:` in the frontmatter to today, run `pnpm docs:index` and `pnpm docs:check`.
