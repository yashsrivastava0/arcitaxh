---
description: Classify files in docs/00-inbox, add frontmatter, move them to a category folder, rebuild the index
---

Triage the raw files in `docs/00-inbox/`.

1. Read `docs/_meta/categories.json`, `docs/_meta/naming.md` and the `research-note-intake` skill.
2. List `docs/00-inbox/` (ignore README.md). If it is empty, say so and stop.
3. For each file: read it, decide the best category folder under `docs/02-research/` (or `03-specs`, `04-decisions`, `06-runbooks` if it clearly belongs there). If it fits no category, leave it in the inbox and tell me why.
4. Add frontmatter per `docs/_templates/research-note.md`: honest `title`, `category` equal to the folder's category, `type`, `status: draft`, `author` (founder unless clearly agent-written), `created`/`updated` from the file's own date if it has one else today, `confidence_tags` only for tags the text actually justifies, `sources` for URLs it cites. Never invent a source or mark a claim Verified.
5. Move it (do not copy) to `docs/<category>/YYYY-MM-DD-kebab-slug.md`. Never overwrite an existing file; add a suffix and mention it.
6. Run `pnpm docs:index` then `pnpm docs:check` and fix any problems.
7. Report a table: old name, new path, category, anything uncertain. Do not commit unless I ask.
