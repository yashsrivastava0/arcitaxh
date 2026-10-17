# AGENTS.md

This repository's agent instructions live in [`CLAUDE.md`](./CLAUDE.md). Read it first; it applies to every AI coding agent.

- Read `docs/INDEX.md` before reading other docs. Never load all of `docs/02-research/`.
- Hard rules: do not invent facts, no I/O in `packages/core`, no dependency without a licence entry, fake LLM client by default.
- Before you stop, update `docs/05-phases/phase-0/status.md` (the handoff).
- Package-level rules are in each package's own `CLAUDE.md`.
