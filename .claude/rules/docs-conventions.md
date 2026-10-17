---
paths:
  - "docs/**"
---

# Docs conventions

- Read `docs/INDEX.md` first; open only the files you need. Never load all of `docs/02-research/`.
- Every Markdown file outside `00-inbox/`, `01-source/`, `_archive/`, `_templates/`, `_meta/` needs frontmatter (schema: `docs/_meta/frontmatter.schema.json`). `category` must match the folder's category.
- Research notes: `YYYY-MM-DD-kebab-slug.md`. ADRs: `NNNN-kebab-title.md`, MADR 4.0. Next ADR number is the highest in `docs/04-decisions/` plus one.
- Never rename a referenced file. Supersede it: set `supersedes`, move the old one to `02-research/_archive/`, set its status to `superseded`.
- Tag claims Verified / Decision / Recommendation / Assumption / Default / Open. Do not invent facts or sources; if a fact cannot be checked, say so.
- `docs/01-source/` is read-only. Propose spec changes in `05-phases/phase-0/spec-change-proposals.md`.
- Research notes are inputs. Only `kb/` records may be shown to users as facts.
- After adding or moving a doc run `pnpm docs:index`, then `pnpm docs:check`.
