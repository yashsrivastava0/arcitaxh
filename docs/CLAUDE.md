# docs/

Purpose: all Markdown knowledge (research, specs, ADRs, phase plans, runbooks, validation).

- Read `INDEX.md` first; then only the files you need. Never load all of `02-research/`.
- Frontmatter is required outside `00-inbox/`, `01-source/`, `_archive/`, `_templates/`, `_meta/` (schema: `_meta/frontmatter.schema.json`). `category` must match the folder's category.
- Never rename a referenced file; supersede it (`supersedes`, move the old one to `02-research/_archive/`).
- `01-source/` is read-only. Spec changes are proposed in `05-phases/phase-0/spec-change-proposals.md`, never edited in place.
- Conflicts between documents go to `05-phases/phase-0/conflicts.md`. Never resolve one silently.
- Tag claims: Verified / Decision / Recommendation / Assumption / Default / Open. Do not invent facts or sources.
- Test: `pnpm docs:check` (CI blocks on it). After adding or moving a doc: `pnpm docs:index`.
- Generated, never hand-edit: `INDEX.md`, `07-validation/phase-0/results/*`.
