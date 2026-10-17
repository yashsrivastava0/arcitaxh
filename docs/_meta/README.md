# Docs meta

- `frontmatter.schema.json`: the JSON Schema every doc's frontmatter is validated against.
- `categories.json`: folder to `category` map, ignored folders and exempt file names.
- `naming.md`: file naming rules.

`tools/docs-index` reads all three. Change them together, and run `pnpm docs:check`.

How the category is derived: for `02-research/<x>/` the category is `<x>`. For every other numbered folder it is the name without the number (`03-specs` is `specs`, `05-phases/phase-0/` is `phases`). The category is therefore the same for a file and all of its subfolders.
