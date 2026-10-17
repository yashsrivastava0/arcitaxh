# Decision-Native Architecture Canvas (working name)

A paid web canvas where an AI engineer draws an AI-app architecture and gets a sourced, conditional verdict for every component: the pick, why, the alternatives and why each lost, and what would flip it. Verdicts come from a first-party knowledge base in which every price and limit has a source and a verified date. A deterministic engine does the elimination, scoring and arithmetic; models only explain, or debate close calls.

**Status: Phase 0.** The goal is to validate the engine on plain pages before any canvas is built. See [`docs/05-phases/phase-0/status.md`](docs/05-phases/phase-0/status.md) for where things stand and [`docs/05-phases/phase-0/plan.md`](docs/05-phases/phase-0/plan.md) for the plan.

## Run it

Requirements: Node 24 LTS (`.nvmrc`), pnpm (version in `package.json#packageManager`). Docker is only needed for the integration tests (a local PostgreSQL).

```bash
pnpm install
pnpm docs:check      # validate docs frontmatter and links
```

More scripts arrive with each milestone; the table in [`CLAUDE.md`](CLAUDE.md) lists every command and the milestone that adds it. Tests, local development and CI use a fake model client. Real model calls need `ALLOW_REAL_LLM=1` and a spend cap; see `.env.example` (names only) and `config/`.

## Where things live

| Path | What |
|---|---|
| `docs/` | All Markdown knowledge. Start at [`docs/INDEX.md`](docs/INDEX.md) |
| `docs/01-source/` | The three canonical documents: blueprint, research report, architecture specification |
| `packages/core` | Pure TypeScript core: types, pipeline, rules, calculators, grounding validator (no I/O) |
| `packages/kb`, `packages/llm`, `packages/db` | Knowledge-base loader, model layer, database adapters |
| `apps/api`, `apps/web` | Minimal API and plain web pages. `apps/worker` is a Phase 2 placeholder |
| `kb/` | Knowledge base as code. Real records are promoted by the founder; agents only propose |
| `config/` | Defaults, Phase 0 settings and the model roster (founder fills the blanks) |
| `tools/` | CLIs: docs index, KB checks, the Phase 0 harness, licence gate |
| `.claude/`, `CLAUDE.md`, `AGENTS.md` | Instructions for AI coding agents |

## Working agreements

- Do not invent prices, limits, model ids, versions or licences; facts come from sources with dates.
- No dependency without a row in [`docs/03-specs/licence-register.md`](docs/03-specs/licence-register.md).
- Defaults live in config. Missing data makes a verdict uncertain; it never silently decides.
- Out of scope in Phase 0: the canvas, accounts, billing, streaming, exports, MCP, GitHub App.

Proprietary; all rights reserved. See [`LICENSE`](LICENSE).
