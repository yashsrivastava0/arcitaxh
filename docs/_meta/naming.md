# Naming rules

- Research notes: `YYYY-MM-DD-kebab-slug.md`, placed in a category folder under `02-research/`. The date is the creation date.
- ADRs: `NNNN-kebab-title.md` in `04-decisions/`, MADR 4.0 format. ADR-001..031 mirror specification section 19; numbering continues from 032.
- Phase documents use fixed names: `plan.md`, `status.md`, `conflicts.md`, `parking-lot.md`, `questions.md`, `spec-change-proposals.md`.
- Never rename a file after anything references it. Supersede instead: set `supersedes` in the new file's frontmatter and move the old file to `02-research/_archive/` (set its `status: superseded`).
- Folder names are lowercase kebab-case. Numbered top-level folders keep their numeric prefix.
