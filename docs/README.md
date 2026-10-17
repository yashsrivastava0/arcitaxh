# Docs

All Markdown knowledge lives here. The system is built so hundreds of research notes can be added without turning into a mess, and so an AI agent can find the right three files without loading the other three hundred.

## Reading rule

Read [`INDEX.md`](./INDEX.md) first (generated: title, category, status, date, path). Then read only the files relevant to the task. Never load all of `02-research/`. Research notes are inputs; only `kb/` records may ever be shown to users as facts.

## Layout

| Folder | Purpose |
|---|---|
| `00-inbox/` | Raw drops. No rules. Triage with `/triage-inbox`. |
| `01-source/` | The three canonical documents. Read-only except spec revisions. |
| `02-research/<category>/` | Categorised research notes. `_archive/` holds superseded notes. |
| `03-specs/` | Current spec versions, `licence-register.md`, per-subsystem specs. |
| `04-decisions/` | MADR ADRs. |
| `05-phases/` | Plans and status per phase. `phase-0/status.md` is the session handoff. |
| `06-runbooks/` | Operational procedures. |
| `07-validation/` | Protocols, pre-registration and results. |
| `_templates/` | Copy, do not edit in place. |
| `_meta/` | Frontmatter schema, category map, naming rules. |

## Adding a research note

1. Copy `_templates/research-note.md` into the right `02-research/<category>/` folder as `YYYY-MM-DD-kebab-slug.md` (or run `/new-research-note <category> <title>`).
2. Fill the frontmatter. `category` must equal the folder's category (see `_meta/README.md`).
3. Run `pnpm docs:index`, then `pnpm docs:check`.

Or just drop the raw file into `00-inbox/` and run `/triage-inbox` later.

## Tags

Carry these into notes and ADRs. **Verified**: checked against a linked source on a stated date. **Decision**: settled by the founder, never reopened. **Recommendation**: proposed, unconfirmed. **Assumption**: unconfirmed, ask or verify. **Default**: a starting value for a number, limit or threshold, kept in config. **Open**: not yet chosen.

## Tooling

`pnpm docs:check` validates frontmatter for every Markdown file outside `00-inbox/`, `01-source/`, `_archive/`, `_templates/` and `_meta/` (files named `README.md`, `INDEX.md` and `CLAUDE.md` are exempt from frontmatter but their links are still checked). It also checks that relative links resolve, that `supersedes` and `related` targets exist, and that `INDEX.md` is current. `pnpm docs:index` regenerates `INDEX.md`. CI runs `docs:check`.
