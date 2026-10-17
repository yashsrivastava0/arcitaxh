---
name: research-note-intake
description: How to file a research note: category choice, naming, frontmatter, tags and supersession. Use when triaging docs/00-inbox, creating a note, or fixing a docs:check failure on a note.
---

# Research note intake

A research note is an **input**. It is never shown to users as fact; only promoted `kb/` records are. Read `docs/INDEX.md` before adding anything, to avoid duplicates.

Reference files:
- [frontmatter.md](./frontmatter.md): every field, its allowed values, and the date rules.
- [categories.md](./categories.md): which folder a note belongs in.

Steps:
1. Pick the category (see categories.md). If a note spans two, file it under the one that will act on it and list the other note in `related`.
2. Name it `YYYY-MM-DD-kebab-slug.md` (creation date). Put it in `docs/02-research/<category>/`.
3. Fill the frontmatter from the template `docs/_templates/research-note.md`. `category` must equal the folder's category.
4. Tag claims honestly: Verified (checked against a linked source on a stated date; set `verified_on`), Recommendation, Assumption, Open. Never mark something Verified that you did not check, and never invent a source URL.
5. Never rename a file other docs reference. To replace a note, create the new one with `supersedes: [old path]`, move the old one to `docs/02-research/_archive/`, set its `status: superseded`.
6. Run `pnpm docs:index` then `pnpm docs:check`.

Vendor facts that might become KB records belong in `docs/02-research/kb-sources/` (use `docs/_templates/kb-source-note.md`) and are promoted through `/propose-kb-record`; the note itself is not the KB.
