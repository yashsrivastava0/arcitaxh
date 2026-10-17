# CLAUDE.md

Read this first. It applies to every AI coding agent in this repo. Package-level rules are in each folder's own `CLAUDE.md` (they load when you work in that folder), and short focused rules are in `.claude/rules/`.

## 1. What this is

The "Decision-Native Architecture Canvas" (working name): a paid web canvas where an AI engineer draws an AI-app architecture and gets a sourced, conditional verdict for every component. A deterministic engine does elimination, scoring and arithmetic; models only explain or debate.
The repo is in **Phase 0**: validate the engine on plain pages before any canvas is built. The founder is a solo builder; keep scope small.
Source documents (`docs/01-source/`), by precedence: (1) `blueprint.pdf`, where a **Decision** wins; (2) `architecture-specification-v0.1.pdf`; (3) `decision-canvas-build-vs-buy.md`. If they conflict, write it to `docs/05-phases/phase-0/conflicts.md`; never resolve one silently.

## 2. Where things are

Read `docs/INDEX.md` first, then only the files you need. Never load all of `docs/02-research/`.

```text
docs/        all Markdown knowledge (research, specs, ADRs, phases, runbooks, validation)
config/      defaults/*.json (every Default value), phase0.json, model-roster.json
kb/          knowledge base as code: decision-types, options, records, proposals, snapshots, fixtures
packages/    core (pure TS, no I/O) · kb · llm · db · tsconfig
apps/        api (Hono) · web (Vite + React, plain pages) · worker (placeholder, Phase 2)
tools/       CLIs: docs-index, kb-check, kb-build, kb-propose, phase0, notices (never imported by packages or apps)
infra/       local Postgres (docker-compose). Hosting is Open (ADR-029)
.claude/     rules, commands, agents, skills
```

Dependency direction: `core` imports nothing from the other packages. `kb` imports `core`. `llm` imports `core` and `kb`. `db` imports `core`. `web` imports `core` only. Only adapters call vendor SDKs (the AI SDK lives only in `packages/llm/src/adapters/`). `tools/` may import anything; nothing imports `tools/`.

## 3. Commands

Run from the repo root with pnpm (version in `package.json#packageManager`, Node per `.nvmrc`). The "Since" column says which milestone adds each script; if a script is missing, that milestone is not done yet.

| Command | Does | Since |
|---|---|---|
| `pnpm install` | Install with the lockfile | M0 |
| `pnpm docs:check` / `pnpm docs:index` | Validate docs frontmatter and links / regenerate `docs/INDEX.md` | M0 |
| `pnpm typecheck`, `pnpm lint` | TypeScript and lint | M1 |
| `pnpm check:boundaries` | Dependency-direction rules | M1 |
| `pnpm licences:check` | Licence gate | M1 |
| `pnpm test`, `pnpm test:core` | All tests / core only | M1 |
| `pnpm kb:check`, `pnpm kb:build`, `pnpm kb:sweep` | KB release checks / bundle / list due and expired | M3 |
| `pnpm db:migrate` | Apply migrations (needs Postgres) | M8 |
| `pnpm dev` | API + web in development (fake LLM client) | M9 |
| `pnpm phase0:*` | Blind-test harness commands | M10 |
| `pnpm ci` | Everything CI runs, in CI order | M1, grows each milestone |

## 4. Hard rules (non-negotiable)

1. **Do not invent** prices, limits, rate tiers, model names or IDs, library versions, licences, or competitor features. Read versions from the registry/lockfile at build time; read vendor facts from the vendor page and record the source.
2. **No model supplies a price, limit or capability.** Models explain, rank candidates they are given, or debate. They never create facts. Models never write KB records; they may *propose*, a person approves.
3. **`packages/core` performs no I/O.** No fs, network, clock, randomness, env, database. It takes `Clock` and `IdGenerator` through inputs. Browser and server import the same code.
4. **Do not start the canvas (spec Phase 1)** before the Phase 0 gate, unless the founder asks in writing.
5. **No dependency without a licence entry.** Before adding any dependency, check its licence from the package itself and add a row to `docs/03-specs/licence-register.md` (seeded from spec Appendix B). Closed-source commercial use must be permitted. If a licence is unclear, STOP AND ASK.
6. **Defaults live in config** (`config/defaults/*.json`), not code, so Phase 0 can change them without a deploy.
7. **Missing data never silently decides (principle P9).** A missing or expired record never eliminates an option; the option survives and confidence becomes `uncertain`. A rule with missing data returns an `unknown` finding, never a pass.
8. **Never write real KB facts from memory.** See the KB content rule in `kb/CLAUDE.md` (the brief's "Section 10.4" cross-reference is its section 10.6; see conflicts.md C-001). In short: fake records only in `kb/fixtures/`; real ones only as proposals in `kb/proposals/`; never write directly into `kb/records/`.
9. **No real LLM calls** unless `ALLOW_REAL_LLM=1` and a spend cap is configured. Default for tests, local dev and CI is the fake client.
10. **No secrets in the repo.** `.env.example` has names only.

Principles: P1 deterministic core, models at the edge. P2 every fact has a source and date. P3 the canvas (later) is a view of the design model. P4 stream, don't block. P5 one deployable until proven otherwise. P6 quiet guidance. P7 reproducible verdicts (store inputs, KB version, rules version, prompt version, model outputs). P8 spend metered from day one. P9 missing data never silently decides.

## 5. Tag vocabulary

Use these tags in code comments, docs and ADRs.
- **Verified**: checked against a linked source on a stated date. Re-check before relying on it.
- **Decision**: settled by the founder. Never reopen.
- **Recommendation**: proposed, unconfirmed. Ask before changing it in a way that affects scope, cost or licences.
- **Assumption**: unconfirmed. Ask or verify. Never fill in.
- **Default**: a starting value for a number, limit or threshold, tuned by measurement in Phase 0. Not a fact. Lives in config, never in code.
- **Open**: not yet chosen.

## 6. Current phase and scope

**Phase 0.** Foundation, then the engine: pure TS core (types, six-stage pipeline, rules, calculators, grounding validator), KB system with release checks, LLM layer (client, fake, one real adapter, versioned prompts, debate runner, three arms), minimal API, plain web pages (verdict form, public calculator, waitlist, blind-rating), harness for the three-arm blind test.
**Phase 0 gate must pass before canvas work.**
**Out of scope; do not build, do not install dependencies for:** canvas / React Flow, drawer, ghost nodes, numbers strip and slider UI, Better Auth, saved designs and versions, credit ledger and billing, SSE and debate theatre, pg-boss jobs, alerts, exports, MCP server, GitHub App, Yjs. Their folders hold a README only. Feeling tempted is the signal to stop: put it in `docs/05-phases/phase-0/parking-lot.md`.

## 7. Conventions

- ESM everywhere; TypeScript `strict`. Internal packages export source (`exports: ./src/index.ts`); `src/index.ts` is the only import surface.
- Zod is the schema source of truth; types are inferred. JSON Schema files in `kb/schema/` are generated.
- Database: snake_case plural tables; money as `bigint` micro-USD (never floats); UUIDv7 ids generated by the app through the `IdGenerator` port; `timestamptz` UTC; JSONB validated on write; additive-then-contract migrations; an applied migration is never edited.
- API: `routes -> services -> core -> ports -> adapters`; routes never touch the database. Errors use problem-details. Logs are structured JSON with request id, route, status, duration; never request or response bodies.
- Untrusted text (labels, notes, pasted text, vendor-page text, all model output) goes to models only as labelled data blocks and is rendered only as escaped text. Models get no tools.
- Commits: Conventional Commits (`feat(core): ...`), small, one milestone per branch-sized unit. Tests first for the core.

## 8. Definition of done (spec 15.2)

A feature is done when: its tests pass; its analytics events and log fields are defined; the spec/docs are updated with a changelog line (propose it in `docs/05-phases/phase-0/spec-change-proposals.md`; never edit the spec); every new dependency is in the licence register; any model-calling feature reports cost impact and has a cap; keyboard and screen-reader behaviour is checked for new interactive elements; features that cost money sit behind a flag.

## 9. Handoff protocol

Before you stop, update `docs/05-phases/phase-0/status.md`: what is done, what is next, blockers, questions. Leave the repo green (`pnpm ci` as far as it exists). Record every decision you make as an ADR (`/new-adr`); numbering continues from ADR-032. Append conflicts to `conflicts.md` and out-of-scope ideas to `parking-lot.md`.

## 10. Stop and ask

Stop and ask the founder when: a licence is unclear; a fact cannot be verified; two documents conflict; something tagged Assumption or Open would otherwise be guessed; a change adds cost; the brief and the spec disagree. Questions live in `docs/05-phases/phase-0/questions.md`. Non-blocking questions: proceed with the stated default and log the assumption in `plan.md`.
