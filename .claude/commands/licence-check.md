---
description: Verify a package's licence from the package itself and update the licence register
argument-hint: <package>
---

Verify the licence of `$ARGUMENTS` before it is used. Use the `licence-checker` subagent if available.

1. Read the licence from the package itself: its `license` field and its LICENSE file (`npm view <pkg> license version`, then the installed `node_modules/<pkg>/package.json` and LICENSE if installed). Never from memory or from the spec's table alone.
2. Check closed-source commercial use is permitted and that the SPDX id is on the allow-list in `.claude/rules/licences.md`. If it is unclear, copyleft, or non-commercial, STOP AND ASK the founder; do not add the dependency.
3. Check the transitive production dependencies' licences too (`pnpm licenses list --prod` once installed).
4. Add or update the row in `docs/03-specs/licence-register.md` section 2: licence, obligation, status, today's date, where it was read. If the package is an item marked Check in section 1, record the outcome in section 3.
5. Run `pnpm docs:check`. Report the verdict in one line.
