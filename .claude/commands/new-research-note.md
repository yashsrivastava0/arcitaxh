---
description: Create a research note from the template in a category folder
argument-hint: <category> <title>
---

Create a research note. Arguments: `$ARGUMENTS` (first word is the category, the rest is the title).

1. The category must be one of the folders in `docs/02-research/` (see `docs/_meta/categories.json`). If it is not, list the valid ones and stop.
2. Copy `docs/_templates/research-note.md` to `docs/02-research/<category>/<today>-<kebab-title>.md`. Never overwrite an existing file.
3. Fill the frontmatter: title, category, `created` and `updated` = today, `author: founder` unless I say otherwise. Leave the body sections for me to fill unless I gave content.
4. Run `pnpm docs:index` and `pnpm docs:check`. Report the path.
