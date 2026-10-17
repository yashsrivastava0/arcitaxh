# .claude/

Agent configuration, committed so any session is productive within a minute. Formats were checked against the current Claude Code docs on 2026-10-18.

| Path | What |
|---|---|
| `settings.json` | Permissions only (no hooks unless the founder asks). Personal overrides go in `settings.local.json`, which is gitignored along with `CLAUDE.local.md`. |
| `rules/` | Short focused rules. A rule with `paths:` frontmatter loads when you touch matching files; the rest load at launch. |
| `commands/` | Slash commands (`/triage-inbox`, `/new-adr`, ...). Current Claude Code merges commands into skills; these files still work. |
| `agents/` | Subagents with focused tools: `kb-curator`, `licence-checker`, `core-purity-reviewer`, `spec-compliance-reviewer`, `docs-librarian`. |
| `skills/` | `kb-record-authoring`, `research-note-intake`. |

## Permission choices (JSON cannot hold comments)

- **Allow**: this repo's own check scripts and read-only git commands.
- **Ask**: `git push` (never pushes to a remote without confirmation), adding or removing dependencies (each needs a licence row first), approving a dependency build script, and any edit under `kb/records/` (agents never write there; the founder promotes proposals).
- **Deny**: reading `.env` files (`.env.example` stays readable: it holds names only), `rm -rf` on root or home, force-push, `git reset --hard`.
- Deny rules are not a security boundary: they do not stop a script that opens a file itself. They are guard rails for an honest agent.
- "No writes outside the repo" is the default behaviour of the harness (edits outside the working directory are not pre-approved). Do not add `additionalDirectories` without the founder's say-so.
- `phase0:*` commands are deliberately not in the allow list: some of them can spend money (they additionally refuse to run without `ALLOW_REAL_LLM=1` and a spend cap).
