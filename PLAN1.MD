# PHASE 0 BUILD BRIEF: Repository Foundation + "Validate the Engine"

You are the lead engineer for a solo founder building the "Decision-Native Architecture Canvas" (working name). This brief is your complete instruction set for the first build phase. Read it fully before touching anything. Follow it in order. Do not skip details. Where the brief says STOP AND ASK, stop and ask the founder.

---

## 1. Mission and definition of done

Build two things, in this order:

**Part A, Foundation (prerequisite).** A production-grade monorepo, a documentation system that can absorb hundreds of research Markdown files without becoming a mess, agent-configuration files so any future AI coding session is productive within a minute, tooling, CI and a licence gate.

**Part B, Phase 0: validate the engine.** Everything in the specification's Phase 0 (spec Section 16.2): the pure TypeScript core (types, six-stage decision pipeline, rules, calculators, grounding validator), the knowledge-base (KB) system with release checks, the LLM layer (LLMClient, fake client, one real adapter, versioned prompts, debate runner), a minimal API, a few plain web pages (verdict form, public no-login calculator, waitlist page showing a price, blind-rating page), and the experiment harness for the three-arm blind test (arms A, B, C), including analysis, citation check, cost logging and a pre-registration lock.

**Phase 0 is done when** every milestone in Section 17 meets its acceptance criteria, CI is green, and `docs/05-phases/phase-0/status.md` says so. Phase 0 is NOT "done" when the blind test passes. The test itself is run by the founder with real engineers; you build the machinery.

**Explicitly NOT in this phase (do not build, do not install dependencies for):** the canvas or React Flow (@xyflow/react), drawer, ghost nodes, numbers strip UI, time slider UI, Better Auth/accounts, saved designs, design versions, credit ledger/billing integration, SSE streaming and debate theater, pg-boss worker jobs, alerts, exports (PDF/MADR/Mermaid), MCP server, GitHub App, Yjs/real-time. Their folders exist only as placeholders (a README stating the phase that fills them). If you feel tempted to build one, that is a signal to stop and re-read this paragraph.

---

## 2. Read first, precedence, tags, hard rules

### 2.1 Read these (in `docs/01-source/`)
1. `blueprint` (founder's product decisions; 17 Oct 2026)
2. `decision-canvas-build-vs-buy` (research report; 17-18 Oct 2026)
3. `architecture-specification-v0.1` (18 Oct 2026; the implementation reference)

If any of the three is missing: STOP AND ASK. Do not proceed from memory.

**Precedence:** a Decision in the blueprint wins; then the specification; then the research report. If documents conflict, do not silently resolve it. Write the conflict to `docs/05-phases/phase-0/conflicts.md` and ask the founder if it affects scope, cost or licences.

### 2.2 Tags (carry them into code comments, docs and ADRs)
- **Verified**: checked against a linked source on a stated date. Re-check before relying on it.
- **Decision**: settled by the founder. Never reopen.
- **Recommendation**: proposed, unconfirmed. Ask before changing it in a way that affects scope, cost or licences.
- **Assumption**: unconfirmed. Ask or verify. Never fill in.
- **Default**: a starting value for a number, limit or threshold. Tuned by measurement in Phase 0. Not a fact. Lives in config, never in code.
- **Open**: not yet chosen.

### 2.3 Hard rules (non-negotiable; also copy into CLAUDE.md)
1. **Do not invent** prices, limits, rate tiers, model names or IDs, library versions, licences, or competitor features. Read versions from the registry/lockfile at build time; read vendor facts from the vendor page and record the source.
2. **No model supplies a price, limit or capability.** Models explain, rank candidates they are given, or debate. They never create facts. Models never write KB records; they may *propose*, a person approves.
3. **`packages/core` performs no I/O.** No fs, network, clock, randomness, env, database. It takes `Clock` and `IdGenerator` through inputs. Browser and server import the same code.
4. **Do not start the canvas (spec Phase 1)** before the Phase 0 gate, unless the founder asks in writing.
5. **No dependency without a licence entry.** Before adding any dependency, check its licence from the package itself and add a row to `docs/03-specs/licence-register.md` (seeded from spec Appendix B). Closed-source commercial use must be permitted. If a licence is unclear, STOP AND ASK.
6. **Defaults live in config** (`config/defaults/*.json`), not code, so Phase 0 can change them without a deploy.
7. **Missing data never silently decides (principle P9).** A missing or expired record never eliminates an option; the option survives and confidence becomes `uncertain`. A rule with missing data returns an `unknown` finding, never a pass.
8. **Never write real KB facts from memory.** See Section 10.4.
9. **No real LLM calls** unless `ALLOW_REAL_LLM=1` and a spend cap is configured. Default for tests, local dev and CI is the fake client.
10. **No secrets in the repo.** `.env.example` has names only.

### 2.4 Principles P1-P9 (spec 3.4; apply everywhere)
P1 deterministic core, models at the edge. P2 every fact has a source and date. P3 the canvas (later) is a view of the design model. P4 stream, don't block. P5 one deployable until proven otherwise. P6 quiet guidance. P7 reproducible verdicts (store inputs, KB version, rules version, prompt version, model outputs). P8 spend metered from day one. P9 missing data never silently decides.

---

## 3. Working method

1. **Plan first.** After reading the three documents, write `docs/05-phases/phase-0/plan.md` (milestones, order, risks, questions) and post a short summary. Wait for the founder's go-ahead on the Section 18 questions that block you (marked BLOCKING). Non-blocking questions: proceed with the stated default and log the assumption.
2. **Work milestone by milestone** (Section 17). One milestone = one branch/PR-sized unit = a series of small commits with Conventional Commit messages (`feat(core): ...`). Do not start the next milestone until the current one's acceptance criteria pass.
3. **Tests first for the core.** Rule fixtures, golden designs and property tests are written with or before the code.
4. **Keep scope small.** If a task seems to need something outside Section 1's scope, note it in `docs/05-phases/phase-0/parking-lot.md` and move on.
5. **Record every decision you make** as an ADR (Section 6.5). Numbering continues from the spec's ADR-001..031.
6. **Update `docs/05-phases/phase-0/status.md` at the end of every session** (what is done, what is next, blockers, questions). This is the handoff for the next AI session.
7. **STOP AND ASK triggers:** unclear licence; a fact you cannot verify; a conflict between documents; anything tagged Assumption or Open that you would otherwise guess; any change that adds cost; any place the brief and the spec disagree.

---

## 4. Repository structure

Package manager: **pnpm workspaces** (Recommendation; verify licence and current version, add to register). Language: TypeScript, `strict: true`, ESM everywhere. Node version: current LTS at build time; pin in `.nvmrc` and `package.json#engines`. A task runner such as Turborepo is optional; add it only if build times justify it (check licence first).

### 4.1 Target tree (create all directories; placeholders get a README only)

```text
.
├─ CLAUDE.md                      # root agent instructions (< 200 lines; Section 7)
├─ AGENTS.md                      # 5-line pointer to CLAUDE.md for other agents
├─ README.md                      # human onboarding: what, how to run, where docs live
├─ LICENSE                        # "All rights reserved" notice (founder to confirm owner name)
├─ THIRD_PARTY_NOTICES.md         # generated, one file for all notice-only licences
├─ package.json                   # private, "license": "UNLICENSED", workspaces
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
├─ .nvmrc  .editorconfig  .gitignore  .env.example
├─ .github/
│  ├─ workflows/ci.yml            # Section 8.3
│  └─ pull_request_template.md    # Definition-of-done checklist (spec 15.2)
├─ .claude/                       # agent configuration (Section 7)
│  ├─ settings.json               # committed: permissions, deny rules
│  ├─ rules/                      # modular always-loaded rules
│  ├─ commands/                   # slash commands
│  ├─ agents/                     # subagents
│  └─ skills/                     # skill packages (SKILL.md each)
├─ docs/                          # ALL Markdown knowledge (Section 6)
├─ config/
│  ├─ defaults/                   # every "Default" value (Section 9)
│  ├─ phase0.json                 # waitlist price, gate thresholds, spend cap
│  └─ model-roster.json           # pinned model ids per role (founder fills)
├─ kb/                            # knowledge base as code (Section 10)
│  ├─ decision-types/
│  ├─ options/<decision-type>/
│  ├─ records/<decision-type>/
│  ├─ proposals/                  # model/agent-drafted records awaiting human review
│  ├─ snapshots/                  # stored source-page text used to verify quotes
│  ├─ schema/                     # GENERATED JSON Schema (never hand-edit)
│  ├─ fixtures/                   # fake records for tests ONLY (never shipped)
│  └─ CHANGELOG.md
├─ packages/
│  ├─ core/                       # pure TS: types, rules, calculators, pipeline, validator
│  ├─ kb/                         # KB schemas/validators (pure) + loader (ports)
│  ├─ llm/                        # LLMClient, adapters, prompts, debate runner, arms
│  ├─ db/                         # Drizzle schema, migrations, repo adapters
│  └─ tsconfig/ (or config/)      # shared tsconfig/lint presets
├─ apps/
│  ├─ api/                        # Hono server (Phase 0: minimal)
│  ├─ web/                        # Vite + React (Phase 0: plain pages only)
│  └─ worker/                     # PLACEHOLDER (Phase 2: pg-boss jobs)
├─ tools/                         # CLIs and scripts (never imported by apps)
│  ├─ docs-index/                 # validates frontmatter, regenerates docs/INDEX.md
│  ├─ kb-check/                   # release checks (Section 10.5)
│  ├─ kb-build/                   # builds dist/kb/<version>.json bundle
│  ├─ kb-propose/                 # snapshot + draft-record helper for curators
│  ├─ phase0/                     # arm runner, assignment generator, analysis, citation sampler
│  └─ notices/                    # generates THIRD_PARTY_NOTICES.md
├─ infra/
│  ├─ docker-compose.yml          # local Postgres (direct connection)
│  └─ README.md                   # hosting is OPEN (ADR-029); deploy files come later
└─ dist/ (gitignored)             # build outputs, KB bundles
```

### 4.2 Deviations from the spec's package list (record as an ADR, "ADR-032: repository layout")
The spec lists `packages/core, kb, llm` and `apps/web, api, worker`. This brief adds `packages/db` (schema and repo adapters shared by api and the future worker), `tools/`, `config/`, and root-level `kb/` (KB content lives in the monorepo for Phase 0; it can be split into its own git repo later, and release tags keep the `kb-YYYY.MM.N` form). Each is a Recommendation. The adapters-in-apps rule from spec 5.3 becomes adapters-in-`packages/db` plus per-app wiring. Note this in the ADR.

### 4.3 Dependency-direction rules (enforce in CI, spec 5.3)
1. `core` imports nothing from `kb`, `llm`, `db`, `api`, `worker`, `web`, `tools`.
2. `kb` may import `core`. `llm` may import `core` and `kb`. `db` may import `core`.
3. `web` imports `core` only (plus its own code). Never `db`, never provider SDKs, never server-only modules.
4. Feature code never calls a vendor SDK directly. Only adapters do (the AI SDK is imported only in `packages/llm/src/adapters/`).
5. `tools/` may import any package; no package imports `tools/`.
6. Enforce with a dependency-analysis tool (spec says "to be chosen"; propose dependency-cruiser or similar, verify licence, add to register) plus an ESLint import-restriction rule as a second net.

### 4.4 Growth plan (so later phases slot in without restructuring)
Put this table in `docs/05-phases/README.md`:

| Later addition | Goes in |
|---|---|
| Canvas, drawer, numbers strip (Phase 1-2) | `apps/web/src/features/canvas/…`, `…/drawer/…` |
| Better Auth, designs, versions | `apps/api/src/modules/{auth,designs}` + `packages/db` migrations |
| Credit ledger, MoR webhooks | `apps/api/src/modules/billing`, `packages/db` |
| Debate streaming (SSE), jobs | `apps/api/src/modules/debates`, `apps/worker/src/jobs/*` |
| Exports, alerts, MCP | `apps/api/src/modules/{exports,alerts,mcp}` |
| GitHub App (Phase 3) | `apps/api/src/modules/github` |
| New domains beyond AI apps | new `kb/` decision-type folders; no code restructure |

Inside each app use `src/modules/<feature>/{routes,service,types}.ts` (api) and `src/features/<feature>/` (web). Routes never touch the database directly (layering: routes → services → core → ports → adapters).

---

## 5. Package internals (target layout)

```text
packages/core/src/
  index.ts                      # public API only
  types/                        # ContextProfile, MustHave, DesignGraph, Component, Edge, Constraints,
                                #   Outcome, Verdict, Reason, Finding, Alternative, FlipCondition, Assumption
  schemas/                      # Zod schemas (source of truth); types inferred from them
  ports/                        # KBReader, Clock, IdGenerator (+ other port interfaces, types only)
  normalise/                    # canonical JSON, number normalisation, layout-field stripping
  hash/                         # inputsHash (SHA-256 over canonical JSON); pure-JS sha256
  pipeline/                     # stage1-constraints, stage2-candidates, stage3-elimination,
                                #   stage4-scoring, stage5-closeness, stage6-assembly, run-pipeline
  rules/                        # one file per rule R-01.. + registry + fixtures/
  graph/                        # adjacency, cycles, topo sort, articulation points (Tarjan)
  calc/                         # cost, latency, free-tier breakpoint, scale presets
  validator/                    # grounding validator G1-G6; numeric-token extraction
  security/                     # secret patterns + redaction
  versions.ts                   # RULES_VERSION and rule versions
  test/                         # golden designs, property tests, parity fixtures
```

Same discipline in `kb/`, `llm/`, `db/`: `src/index.ts` is the only import surface; internal folders are private. Each package has its own `CLAUDE.md` (10-15 lines: purpose, what it may import, how to test).

---

## 6. The documentation system (for the founder's many research files)

The founder will create many Markdown research files in many categories over months. The system must make that painless, keep AI agents from loading everything, and keep facts traceable.

### 6.1 Folder layout (create with a README in each explaining its purpose)

```text
docs/
├─ README.md                 # how docs are organised, naming, frontmatter, workflow
├─ INDEX.md                  # GENERATED registry of every doc (title, category, status, date, path)
├─ 00-inbox/                 # raw drops. No rules. Triage later (/triage-inbox)
├─ 01-source/                # the three canonical documents; read-only except spec revisions
├─ 02-research/              # categorised research notes
│  ├─ market-and-competitors/
│  ├─ pricing-and-payments/
│  ├─ legal-licensing-compliance/
│  ├─ kb-sources/            # vendor-fact research. Feeds the KB; is NOT the KB
│  ├─ debate-and-evals/
│  ├─ llm-providers-and-gateways/
│  ├─ infrastructure-and-hosting/
│  ├─ frontend-and-canvas/
│  ├─ acquisition-and-growth/
│  └─ _archive/              # superseded notes (never delete; move here)
├─ 03-specs/                 # current spec versions, licence-register.md, per-subsystem specs
├─ 04-decisions/             # MADR ADRs: NNNN-kebab-title.md (ADR-001..031 mirrored from spec 19)
├─ 05-phases/
│  ├─ README.md              # growth plan table (Section 4.4)
│  ├─ phase-0/               # plan.md, status.md, conflicts.md, parking-lot.md, questions.md
│  ├─ phase-1/ … phase-3/    # README placeholders
├─ 06-runbooks/              # provider outage, stuck debate, billing mismatch, broken KB release, deletion request, secret leak (stubs now; spec 14.7)
├─ 07-validation/
│  └─ phase-0/               # protocol.md, preregistration.md, preregistration.lock.json,
│                            #   scenarios/, results/, curation-hours.csv, citation-check/
├─ _templates/               # research-note.md, adr.md, runbook.md, phase-status.md, kb-source-note.md
└─ _meta/                    # frontmatter schema (JSON Schema), naming rules, category enum
```

### 6.2 Naming
- Research notes: `YYYY-MM-DD-kebab-slug.md`, placed in a category folder.
- ADRs: `NNNN-kebab-title.md` (MADR 4.0 format, MIT/CC0).
- Never rename a file after it is referenced; supersede instead (frontmatter `supersedes`, move the old one to `_archive/`).

### 6.3 Frontmatter (required on every file outside `00-inbox/`)

```yaml
---
title: "Human-readable title"
category: market-and-competitors   # must equal the folder name (enum in docs/_meta)
type: research                     # research | spec | decision | runbook | plan | note | source
status: draft                      # draft | reviewed | verified | superseded | archived
tags: []                           # free tags
created: 2026-10-18
updated: 2026-10-18
verified_on: null                  # date if facts were checked against sources
author: founder                    # founder | agent | external
sources: []                        # URLs
supersedes: []                     # relative paths
related: []                        # relative paths
confidence_tags: []                # Verified | Decision | Recommendation | Assumption | Default | Open
---
```

### 6.4 Tooling for docs (`tools/docs-index`)
- Validates frontmatter against the JSON Schema in `docs/_meta` for every Markdown file outside `00-inbox/` and `_archive/`; checks `category` matches the folder, relative links resolve, and `supersedes` targets exist.
- Regenerates `docs/INDEX.md` (grouped by category, sorted by date, with status). CI fails if `INDEX.md` is out of date or a file is invalid.
- Scripts: `pnpm docs:check`, `pnpm docs:index`.
- Pick the lightest implementation (a small TS script plus a YAML parser; verify the parser's licence, add to the register).

### 6.5 ADRs
Use MADR 4.0 (`docs/_templates/adr.md`). Create ADR files for every spec decision that Phase 0 touches (at minimum ADR-006..013, 016..018, 022..028, 030, 031) as short stubs that link to the spec, then new ones for your own choices (ADR-032 layout, plus any tooling choice, e.g. test runner, linter, dependency-analysis tool, id generation, rate limiter). Each ADR records status (Decision / Recommendation / Open), context, options, outcome and consequences.

### 6.6 Rules for agents reading docs
Always read `docs/INDEX.md` first, then only the files relevant to the task. Never load all of `docs/02-research/`. Research notes are *inputs*; only `kb/` records may ever be shown to users as facts.

---

## 7. Agent-configuration files (so any future AI session works well)

Before writing these, fetch the current Claude Code docs for memory/CLAUDE.md, settings, slash commands, subagents and skills (start from `https://docs.claude.com/en/docs/claude-code/overview`) and match the exact current schemas. Do not rely on memory for file formats.

### 7.1 Root `CLAUDE.md` (under 200 lines). Required content
1. **What this is** (3 lines) and the precedence order of the three source documents.
2. **Where things are**: the tree from Section 4.1 in condensed form; "read `docs/INDEX.md` first".
3. **Commands**: install, `pnpm dev`, `pnpm test`, `pnpm test:core`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm kb:check`, `pnpm kb:build`, `pnpm docs:check`, `pnpm db:migrate`, `pnpm phase0:*`, `pnpm ci` (runs everything CI runs).
4. **Hard rules** (Section 2.3, verbatim, numbered).
5. **Tag vocabulary** (Section 2.2).
6. **Current phase and what is out of scope** (Section 1), plus "Phase 0 gate must pass before canvas work".
7. **Conventions**: ESM, strict TS, Zod as schema source of truth, snake_case DB, micro-USD bigint money, UUIDv7 ids from the app, timestamptz UTC, problem-details errors.
8. **Definition of done** (spec 15.2).
9. **Handoff protocol**: update `docs/05-phases/phase-0/status.md` at end of every session.
10. **Stop-and-ask triggers** (Section 3.7).

### 7.2 Nested `CLAUDE.md`
One per `packages/*`, `apps/*`, `kb/`, `docs/` (10-15 lines each: purpose, allowed imports, how to test, local gotchas). The `kb/CLAUDE.md` restates the K1-K7 principles and the "never from memory" rule.

### 7.3 `.claude/rules/` (short focused files, loaded alongside CLAUDE.md)
`core-purity.md`, `kb-records.md`, `docs-conventions.md`, `security-and-privacy.md`, `licences.md`, `testing.md`, `no-invention.md`, `llm-usage.md` (fake client by default; spend cap; no prices in prompts).

### 7.4 `.claude/commands/` (slash commands; each a short Markdown prompt)
`/triage-inbox` (classify files in `docs/00-inbox`, add frontmatter, move to category, run docs-index), `/new-research-note <category> <title>`, `/new-adr <title>`, `/add-decision-type <id>`, `/propose-kb-record <url>` (Section 10.4 flow), `/kb-check`, `/phase0-status` (refresh status.md), `/licence-check <package>` (verify licence, update register), `/session-handoff`, `/ci-local`.

### 7.5 `.claude/agents/` (subagents with focused tools and prompts)
`kb-curator` (drafts proposals only; may fetch vendor pages; never edits `kb/records/`), `licence-checker`, `core-purity-reviewer` (checks no I/O, no clock, no random in core), `spec-compliance-reviewer` (diffs implementation against spec sections), `docs-librarian` (triage/index).

### 7.6 `.claude/skills/`
`kb-record-authoring/SKILL.md` (envelope format, TTLs, quote rules, behaviour enums) and `research-note-intake/SKILL.md` (frontmatter, categories, naming), each with supporting reference files.

### 7.7 `.claude/settings.json` (committed) and local files
Allow: the repo's pnpm scripts, git read commands, test/lint/typecheck. Deny: reading `.env*`, writing outside the repo, destructive commands (`rm -rf` on root or home), and pushing to remotes without confirmation. No hooks unless the founder asks. Gitignore `CLAUDE.local.md` and `.claude/settings.local.json`.

---

## 8. Tooling, licence gate, CI

### 8.1 Proposed dev toolchain (all Recommendation; verify licence + current version for each, then register)
TypeScript; Vitest (unit, property glue, integration); fast-check (property tests); ESLint + Prettier (or Biome, choose one and record an ADR); a dependency-analysis tool (Section 4.3); `tsx` for scripts; Playwright (browser parity test only, Section 12.4); `@noble/hashes` or similar for a synchronous pure-JS SHA-256 (so Node and browser agree without async WebCrypto; verify licence). Runtime: `zod`, `hono`, `drizzle-orm` + `drizzle-kit`, a Postgres driver, `react`, `react-router`, `vite`, the Vercel AI SDK (`ai`) + `@openrouter/ai-sdk-provider` (adapters only), a YAML parser. Use the AI SDK 7 API (`generateText` with structured `Output`/Zod); `generateObject`/`streamObject` are deprecated in v7 (spec A9). Check the installed version's types before coding. Skip Langfuse, promptfoo, Label Studio and PostHog in Phase 0: usage is logged to our own tables and the blind page is built in-house.

### 8.2 Licence gate
- `docs/03-specs/licence-register.md` is seeded from spec Appendix B (copy the table, keep Status values Plan/Reference/Avoid/Check).
- Items marked "Check" in Appendix B (promptfoo, Label Studio, Typst, Vite, Next.js) must be verified from the package before use.
- `pnpm licences:check` fails CI if any installed production dependency's licence is not on an allow-list (MIT, ISC, Apache-2.0, BSD-2/3, 0BSD, CC0, and dual-licence cases handled explicitly) or is missing from the register. GPL/AGPL/SSPL/BUSL/Elastic/"UNLICENSED" in production deps is a hard fail.
- `tools/notices` generates `THIRD_PARTY_NOTICES.md` (use the package manager's built-in licence listing where possible to avoid a new dependency).

### 8.3 CI (`.github/workflows/ci.yml`; every stage blocks merge)
1 frozen-lockfile install → 2 typecheck + lint + dependency boundaries → 3 core unit tests (rule fixtures, calculators, validator, hashing, articulation points) → 4 calculator property + golden tests → 5 parity (Node vs browser build) → 6 KB checks (Section 10.5) → 7 integration tests against real PostgreSQL (service container) → 8 security + licence (dependency audit, secret scan, licence gate) → 9 docs check (frontmatter + INDEX up to date) → 10 build. End-to-end browser flows are a later phase; Phase 0 needs only the parity browser test and a smoke test of the plain pages with the fake model client.

---

## 9. Configuration and defaults (`config/`)

Every value tagged Default goes in `config/defaults/*.json`, validated by a Zod schema in `core` at start-up. Each file carries a `_status` field and `_source` spec section. Contents (all Default unless noted):

```text
scoring.json      theta_clear 0.15; theta_uncertain 0.05;
                  base_weights: equal across the 6 dimensions (cost_fit, scale_fit, latency_fit,
                  operational_simplicity, ecosystem_fit, reversibility);
                  multipliers: solo_or_beginner→operational_simplicity ×2; free_tiers_only→cost_fit ×2;
                  latency_must_have→latency_fit ×2; existing_stack_platform→ecosystem_fit ×1.5;
                  users_12m ≥ 10× users_now→scale_fit ×1.5; renormalise to sum 1
                  dimension values: cost_fit 1.0/0.6/0.2 (0.5 uncertain if price expired);
                  scale_fit 1.0/0.5/0.0; reversibility low 1.0, medium 0.6, high 0.2, unknown 0.5 uncertain;
                  ecosystem_fit 1.0/0.7/0.4
finalists.json    max_finalists 3 (Decision); third added only if within theta_clear of first
rules.json        read_ratio_threshold 0.8 (R-05); month_days 30; max_components 200;
                  hop_default_same_region_ms (small default, marked Default)
freshness.json    ttl_days: price 30, limit 30, rate_limit 30, capability 90, latency_profile 14,
                  guidance 180; due_soon_days 7
debate.json       max_rounds 3 (hard); default_rounds 2; turn_output_cap_tokens 600; judge_cap 1200;
                  timeouts_s: explain 15, turn 90, judge 120; retries: explain 1, turn 2, judge 2;
                  early_stop true; roles: advocate per finalist + skeptic + cost_ops + security + judge
cost.json         layer2_max_paragraphs 3; length_match_tolerance_pct 10
retention.json    rendered_debate_inputs_days 90; debate_events_days 30; verdict_cache_days 90
```

`config/phase0.json` (founder fills before the test opens; release/publish tooling must fail on `null`):

```text
waitlist.displayed_price_usd        null   # founder sets; NEVER invent a price
waitlist.displayed_period           null   # "month" etc.
gate.waitlist_min_join_rate         0.10   # Default per spec 16.2, to be confirmed
gate.h1_min_preference              0.60
gate.alpha                          0.025  # H1 and H2 each (two comparisons)
gate.min_paired_judgments           100
spend.phase0_model_cap_usd          null   # founder sets; runner refuses to start if null
```

`config/model-roster.json`: role → `{ provider, modelId, gateway }` with `modelId` values `"__FOUNDER_TO_SET__"`. The real-LLM runner refuses placeholders. Model identifiers are never hard-coded in code or prompts (spec 6.11, 11.2).

---

## 10. Part B1: Core and knowledge base

### 10.1 Types and schemas (`packages/core`)
Implement exactly the spec shapes with Zod as source of truth: `ContextProfile` and `MustHave` (5.2), `DesignGraph`/`Component`/`Edge` with invariants I1-I8 (5.4), `Verdict`/`Reason` (5.5), `Finding` (5.6), `Constraints`, and `Outcome = Verdict | needs_context | kb_gap`. Keep `position` in `Component` but excluded from every rule and hash. Free text length limits (label ≤ 80). A design holds ≤ 200 components. Reason of `kind: 'fact'` requires non-empty `citedRecordIds`; `kind: 'judgement'` cannot contain numbers. `confidence` is a category, never a percentage. `pick: null` is valid (deferral / no fit).

### 10.2 Normalisation and hashing
Canonical JSON (sorted keys, normalised numbers, layout fields removed) → SHA-256 (synchronous pure-JS, identical in Node and browser). `inputsHash` covers: normalised constraints, decision type, candidate option ids + params, KB version, rules version, prompt version, model roster. Property tests: key order never changes the hash; moving a node never changes the hash; any semantic change does.

### 10.3 The six-stage pipeline (spec 6)
Implement stages 1-6 as separate pure functions plus `runPipeline(inputs, kbReader, config, clock)`:
1. **Constraints**: validate typed fields; keep unknown as unknown; per-decision-type required chips → `needs_context` with the single next question; assumptions register (every default used becomes a plain-language assumption).
2. **Candidates**: options whose decision type and applicability match; include the decision type's deferral option when defined; empty set → `kb_gap` naming the decision type.
3. **Elimination**: families E-1 required capability, E-2 residency, E-3 deploy target, E-4 free-only budget (via calculator); E-5 and E-6 are optional in Phase 0 (implement if cheap; they are in spec 6.4). Eliminate only on a *fresh* record that proves failure; missing/expired → option survives, `uncertain`. Record `{option, ruleId, recordId}` for every elimination.
4. **Scoring**: the six dimension functions and weight multipliers from config; store per-dimension breakdown; unknown dimensions excluded from the sum and the score flagged partial.
5. **Closeness**: margin → `clear | close | uncertain` (also `uncertain` if either top option carries an uncertain flag); finalists (top 2, third only if within `theta_clear`, max 3).
6. **Assembly**: pick, curated `why_pick` / `why_not` sentences selected by matching constraints (each with its record id), assumptions, flip conditions (curated plus calculator-computed), runner-up, reversal cost from `migration_effort`, blind spots, versions. `pickOrigin = 'rules'`, `rulesPick = pick`. No model writes anything here.

Golden tests: fixed inputs → exact expected verdicts, including every outcome type, every elimination family, the deferral option, the P9 behaviour (expired record never eliminates), and a "partial score" case.

### 10.4 Rules, graph helpers, calculators
- **Rule contract (spec 7.1)**: `{id, version, title, appliesTo, severity, check(graph, ctx, kb, clock) → Finding[], fixtures[]}`; pure; missing data → `unknown` finding; each rule's version stored on every finding; `RULES_VERSION` aggregate in `versions.ts`.
- **Implement R-01 to R-07** (spec 7.2): R-01 agent loop on sync path; R-02 no fallback model; R-03 unbounded context growth; R-04 single point of failure (articulation points; write Tarjan in `graph/` and test it against hand-built graphs including cycles, disconnected components and a single-node graph); R-05 read-heavy path without cache (threshold from config); R-06 sync latency over budget; R-07 free tier reached within 12 months. **Also implement R-09 (secret-looking text; severity `block`) and `security/redact`**, because Phase 0 sends scenario text to models. R-08, R-10, R-11 are optional now (cheap to add; their fixtures exist in the spec).
- Each rule ships ≥ 2 fixtures (one firing, one not) in `rules/fixtures/`. Appendix C.1 of the spec is a ready-made fixture for R-01, R-02, R-04, R-05, R-08.
- **Calculators (spec 7.3-7.7)**: money in micro-USD integers internally; month = 30 days (config); latency algorithm (sync edges only, p50/p95 per node, hop times, slowest parallel branch, node without profile → result flagged `uncertain` and the node named, never counted as zero; label the p95 sum "conservative upper bound"); cost per request and per month from KB price records (expired price still displayed with "price last verified on X; expired" and cannot eliminate); free-tier breakpoint `L / u1`; scale presets 1×, 10×, 100×; typed behaviours (`hard_stop`, `pauses_after_inactivity`, `scale_to_zero`, `overage_billed`, `auto_upgrade`, `throttled`) with the spec's calculator responses. If the user gives no traffic figure, show per-request cost only and say a traffic estimate is needed. Never invent traffic.
- **Tests**: golden numbers to the last digit (use spec Appendix C.2 and C.3 as starting cases, but remember their numbers are *placeholders*, not facts); property tests with fast-check (more traffic never lowers cost; breakpoint never negative; adding a sync hop never lowers latency; removing a cache never lowers read-path cost); parity (Section 12.4).

### 10.5 Grounding validator (`core/validator`, spec 8.7)
Implement checks G1-G6 as pure functions returning structured failures: G1 every fact reason cites ≥ 1 record id and every id exists in the verdict's KB release; G2 cited records fresh at verdict time (else mark `stale`/`uncertain`); G3 every number/price/limit in text matches a cited record value, a user input, or a calculator output (extract numeric tokens with units; define the matching rules and document them); G4 every product/option name exists in the KB for that decision type; G5 judgement reasons contain no numbers; G6 pick inside candidate/finalist set and flip conditions reference existing fields. G7 (one repair attempt, then fallback) is orchestrated in `llm`. Write an **adversarial fixture suite**: invented price, invented product, number off by a unit, stale record cited, pick outside finalists, number hidden in a judgement. All must be rejected.

### 10.6 KB package and content (`packages/kb`, `kb/`)
- **Record envelope** exactly as spec 8.3 (`id`, `type`, `decision_type`, `subject`, `body`, `source{url,quote,retrieved_on}`, `verification{last_verified,valid_until,verified_by}`, `curator_note`), types: option, limit, price, capability, latency_profile, tradeoff, flip, guidance, antipattern; typed bodies per spec 8.3 and 7.6 enums. Zod schemas are the source; generate `kb/schema/*.json` via a script (never hand-edit).
- **Layout** per spec 8.2: `decision-types/<id>.yaml` (applicability, required chips, rules list, deferral option, palette mapping), `options/<dt>/<option>.yaml`, `records/<dt>/<id>.yaml`.
- **Loader**: reads the repo, validates, builds a release bundle `dist/kb/<version>.json` (`tools/kb-build`) that the API and the web calculator both consume; `KBReader` implementation over the bundle (core stays I/O-free).
- **Release checks (`tools/kb-check`, all block CI except the sample audit)**: schema valid; no placeholder values in any record used by a launch decision type (`"<…>"` patterns, `"__FOUNDER_TO_SET__"`, `TODO`); `quote` appears verbatim in `kb/snapshots/<record>` (store snapshots at review time); no expired record for launch types; every cited id exists; `valid_until` equals `last_verified` + TTL by type (TTLs from config); lists records due within 7 days. Fixture records in `kb/fixtures/` are exempt but must never be bundled into a release (test this).
- **Freshness states**: fresh / due soon / expired; runtime shows expired as expired and they never eliminate or produce a pick (P9).
- **Content rule (CRITICAL).** You must NOT write real prices, limits, capabilities or latency numbers from memory. Allowed: (a) fake records in `kb/fixtures/` with obviously fake vendors (e.g. `vendor.example`), used only by tests and the golden designs; (b) *proposals* in `kb/proposals/`: using `tools/kb-propose` you may fetch a vendor's own page, save the extracted text to `kb/snapshots/`, and draft a record with an exact quote, URL and retrieval date, marked `status: proposed`, `verified_by: null`. The founder reviews the quote against the live page and promotes it to `kb/records/` (setting `verified_by`, `last_verified`, `valid_until`). You never write directly into `kb/records/`.
- **Proposed first five decision types (Open question #7; Recommendation, founder confirms): `vector-store`, `database`, `cache`, `queue`, `model-access`.** Build the schema, rules lists, deferral options (e.g. "keep vector search inside your existing database") and fixture-based vertical slice first for `vector-store`. Author the `decision-types/*.yaml` structure for all five; leave real records to the founder's review flow.
- **Update pipeline (spec 8.5) in Phase 0**: only what is cheap: the daily "expiry sweep" CLI (`pnpm kb:sweep`: lists due/expired, changes nothing) and the quote-verification validator that a future LLM-proposal step will call (every number in a proposal must appear in its quote; quote must appear in the new snapshot; source URL must match). changedetection.io, price-catalog diffs and SNS are Phase 1+ and out of scope.
- **Curation hours (H4)**: `docs/07-validation/phase-0/curation-hours.csv` (decision_type, date, hours, notes) and a `/log-curation-hours` command.

---

## 11. Part B2: LLM layer (`packages/llm`)

### 11.1 `LLMClient` (spec 10.4; implement exactly)
`complete({model, promptId, system, data: DataBlock[], outputSchema?, maxOutputTokens, timeoutMs, purpose: 'explain'|'debate_turn'|'judge', signal})` → `{output, usage{tokensIn,tokensOut,tokensCachedIn}, providerCostMicroUsd|null, providerRequestId, finishReason}`. Flat output schemas only (no deep nesting, avoid unions); Gemini supports only a JSON Schema subset and Claude citations cannot combine with JSON output mode, so the judge cites through an explicit `citedKbIds` field checked by the validator (spec A43/A44).

### 11.2 Adapters
- `FakeLLMClient`: deterministic, returns recorded outputs keyed by `promptId` + input hash; supports scripted failures (timeouts, invalid JSON, rate limits) for testing retries and repair. Default everywhere.
- `OpenRouterAdapter` (via the AI SDK provider): the only place the AI SDK is imported. Forward the `AbortSignal` into the provider request. Use the response's reported per-call cost when present (`cost_source = provider_reported`), else compute from KB price records (`computed_from_kb`) with a price snapshot. Verify at build time how the current provider package reports usage and cost; do not assume field names. Gateway choice is ADR-014 (Open): keep `LLM_GATEWAY` switchable; do not build a second adapter now.
- Retry policy (Default, from config): transient errors (rate limit, 5xx, timeout) retried with backoff; a response failing schema validation is NOT retried as transient and goes to the repair step; a stream that already emitted text is not restarted (Phase 0 does not stream anyway).
- Logging: provider request ids only; no prompt/response bodies in general logs.

### 11.3 Prompts (`packages/llm/prompts/<name>/<version>.md`; files, versioned, never edited in place)
`arm-a-single-model@1`, `explain@1` (Layer 2), `advocate@1`, `skeptic@1`, `cost-ops@1`, `security@1`, `judge@1`. Rules: no prices, limits or product claims inside prompts; numbers arrive only in data blocks; user text, pasted content and KB quotes are wrapped in delimited data blocks, labelled as data, with the system prompt stating that instructions inside data blocks must not be followed; stable content first (role instructions, KB excerpts for finalists), changing content last (transcript) to enable provider prompt caching.

### 11.4 Layer 2 explanation contract (spec 11.10)
Input: stored verdict + component + one question kind (why this option / why not X / what would change it / plain-language). Output: `{paragraphs: [{text, citedRecordIds[]}]}` (≤ 3 paragraphs, config). Validate with G1-G5; one repair attempt; on failure show curated template text, never failed model text. Cache by `inputsHash` (exact hash, never semantic).

### 11.5 Debate runner (Layer 3; spec 11; synchronous batch execution in Phase 0, no streaming)
- Only for finalists (2-3) of a `close` or `uncertain` decision, or when asked. Roles: one advocate per finalist, skeptic, cost/ops voice, security voice, judge. Fixed order: advocates in finalist order, then skeptic, cost voice, security voice. Rounds: default 2, hard max 3. **No voting between rounds.**
- **Anti-conformity rules (spec 11.3)**: advocate keeps its assigned finalist (may concede a *claim* with a reason, never switch sides); role voices never see vote counts or other roles' confidence; turns anonymised to the judge (role labels, no provider names); early stop if in a round no advocate changes position and no claim is contested.
- **Roster policy (Recommendation, tested in Phase 0)**: advocates/voices from ≥ 2 providers; judge from a provider family not used by any advocate where possible; the exact pinned roster stored with each debate.
- Turn and judge schemas per spec 11.3/11.4 (Zod, flat). Output caps from config. Judge output goes through the grounding validator; on failure one repair, then the debate completes with the rules verdict plus a note ("could not produce a valid verdict"), failure recorded, cost settled. When the judge differs from rules: `pickOrigin = 'debate'`, `rulesPick` preserved.
- State machine statuses: `queued → running → judging → validating → completed | failed | cancelled` (spec 11.5). Honour `AbortSignal` at every call. Cost cap: running total checked after every call against a per-debate budget; stop with `failed (budget)` if exceeded.
- Persistence through ports (`DebateRepo`, `UsageRepo`): per-turn rows keyed `(debate, round, role)` with `ON CONFLICT DO NOTHING` so a resumed run skips finished turns; every model call writes one usage row (tokens, cost, cost source, price snapshot). Written so the Phase 2 pg-boss worker can wrap it unchanged.
- Tests: golden debates with the fake client (structure, early stop, anti-conformity enforcement, repair path, fallback to rules verdict, budget stop, cancel via signal, resume skipping finished turns). Injection suite (spec 15.4): hidden instructions in labels, fake system messages, attempts to pick outside the finalist set, markup intended to leak when rendered. Expected: pick stays inside the set, validator rejects ungrounded claims, nothing unsafe rendered, security event logged. **Models receive no tools.**

### 11.6 The three arms (`packages/llm/src/arms/`)
- **Arm A**: one strong model, carefully written prompt, asked for the neutral template fields (pick, reasons, assumptions, flip conditions, runner-up); no KB.
- **Arm B**: the engine without debate: KB candidates → elimination → scoring → Layer 2 explanation by one model.
- **Arm C**: the engine with debate (Layer 3).
- Optional fourth arm: judge sampled 3× with majority vote; implement only if trivial.
- **Neutral template**: all arms render to one schema `{pick, why[], assumptions[], flipConditions[], runnerUp}`; no model names; no provider names; same markdown renderer. Measure word counts; report any scenario whose arm outputs differ by more than the length tolerance (config, Default 10%) and flag for founder review, do not silently truncate.

---

## 12. Part B3: Data, API, web

### 12.1 Database (`packages/db`; Drizzle + PostgreSQL; local via `infra/docker-compose.yml`)
Conventions (spec 10.1): UUIDv7 ids generated by the app (via the `IdGenerator` port), `timestamptz` UTC, money as `bigint` micro-USD (no floats), snake_case plural tables, JSONB validated against Zod/JSON Schema on write, additive-then-contract migrations (never edit an applied migration). Two connection strings: `DATABASE_URL` (pooled, normal use) and `DATABASE_DIRECT_URL` (direct; unused until Phase 2 streaming but declared now).

Tables to create in Phase 0 (spec 10.3 subset, with the noted adaptations):
- `kb_releases`, `kb_records` exactly as spec 10.3.
- `verdict_cache` (exact-hash key).
- `debates`, `debate_turns` as spec 10.3, **except `user_id` is nullable and has no FK** (no `user` table exists yet). Add the FK in a later expand-and-contract migration. No `debate_events` yet.
- `usage_events` as spec 10.3, **same adaptation**: `user_id text NULL` without FK, plus `run_id uuid NULL`, `purpose` extended allowed values only if needed (record in an ADR).
- Phase 0-specific tables:

```text
phase0_scenarios      id, slug unique, title, design jsonb, context jsonb, decision_type,
                      domain_tags text[], authored_by, reviewed_by, status (draft|approved), created_at
phase0_arm_outputs    id, scenario_id fk, arm ('A'|'B'|'C'), run_id, output jsonb (neutral template),
                      kb_version, rules_version, prompts_version, roster jsonb, word_count int,
                      debate_id null, cost_micro_usd bigint, is_active bool, created_at,
                      unique (scenario_id, arm, run_id)
phase0_raters         id, invite_token_hash bytea unique, domain text, consent_version text,
                      consent_at timestamptz, created_at, deleted_at   -- no names/emails stored
phase0_assignments    id, rater_id fk, scenario_id fk, arm_left, arm_right, position smallint,
                      created_at, unique (rater_id, scenario_id)
phase0_ratings        id, assignment_id unique fk, choice ('left'|'right'|'both_wrong'),
                      reason text null, trust smallint null check 1..5, decided_ms int, submitted_at
waitlist_signups      id, email text, price_shown text, consent bool, created_at   -- PII: retention + deletion path documented
phase0_events         id, event text, anon_id text, props jsonb, created_at
                      -- events: landing_view, price_viewed, waitlist_join, calculator_used, verdict_run
                      -- anon_id = random per page load, no cookies, no fingerprinting
```

Integration tests against real PostgreSQL in CI: migrations apply from empty; idempotent inserts; unique constraints; `ON CONFLICT DO NOTHING` turn writes; retention queries.

### 12.2 API (`apps/api`; Hono on Node; long-running container assumption)
Request lifecycle (spec 9.2): request id header + logs → validate with Zod (400 problem-details on failure) → service layer (core logic via ports) → stable responses; errors in problem-details format. Structured JSON logs (request id, route, status, duration; no bodies). Config from env, validated at start; missing required variables stop the process. Health: `GET /healthz`, `GET /readyz` (database, active KB release). Minimal in-house token-bucket rate limiter (single-instance only; note this in an ADR and in code).

Endpoints (all under `/v1` except health):

```text
GET  /v1/kb/version                     public   current KB release + date
GET  /v1/kb/decisiontypes               public
GET  /v1/kb/options?decisionType=       public
GET  /v1/kb/records/{id}                public   record with source quote + dates
POST /v1/analyze                        public   Layer 1: findings + blind spots + calculator results (stateless, no model calls)
POST /v1/verdict                        public   context + decisionType (+ optional design) → verdict | needs_context | kb_gap (rules only)
POST /v1/explain                        gated    Layer 2, metered, cached (only when ALLOW_REAL_LLM or fake)
POST /v1/waitlist                       public   email + consent; records price shown
POST /v1/events                         public   whitelisted event names only
GET  /v1/phase0/rate/{token}/next       token    next assignment for this rater
POST /v1/phase0/ratings                 token    submit a rating
```

Auth in Phase 0 = invite tokens for raters only (store hash only). No admin web surface: scenarios, arm runs, rater creation and exports are CLI commands in `tools/phase0`. Response headers: strict CSP (scripts from own origin only, no inline handlers), no raw HTML rendering anywhere. CORS locked to the app origin.

### 12.3 Web (`apps/web`; Vite + React + React Router; plain, accessible, desktop first)
Framework is ADR-030 (Open; Recommendation Vite with prerendered marketing routes, Next.js 16 is the alternative). Write a half-page comparison ADR, proceed with Vite, and mark the ADR "Recommendation, pending founder". Pages:

1. `/` landing + **waitlist with the price visible** (price read from `config/phase0.json`; if null, render a clearly marked "PRICE NOT SET" banner and disable the form). Consent checkbox. Records `landing_view`, `price_viewed`, `waitlist_join`.
2. `/calculator` **public, no-login AI-app cost, latency and free-tier fit calculator**: runs Layer 1 code *in the browser* from the KB release bundle; no model call; inputs per spec 7.3; 1×/10×/100× presets; shows which component breaks first, bill after, critical-path latency (labelled "conservative upper bound"), assumption that usage grows in proportion to traffic. Shows "no data" gracefully when the KB bundle has only fixtures; never shows fixtures to the public in production builds.
3. `/verdict` **plain form** (context chips as form fields + decision type + optional pasted design JSON or pick a golden design) → renders the **decision receipt**: pick, why (fact/judgement labelled), assumptions, flip conditions, alternatives and why each lost, runner-up, confidence in words, blind spots, **every fact with source link and verified-on date**, KB and rules versions.
4. `/rate/:token` **blind rating page**: consent screen (plain language; what is rated, anonymised storage, designs used only with consent, deletion period 6 months after analysis, Default), then one scenario at a time: scenario summary, two answers side by side in the neutral template, no model names, sides from the stored assignment, forced choice "Which would you act on?" + "both are wrong" + optional free-text reason + 5-point trust + decision time measured client-side.
5. `/terms`, `/refund`, `/privacy`: stub pages visibly marked "PLACEHOLDER, not legal text, counsel to review" (a merchant of record's domain review will later require live pages). The founding-member checkout is NOT built (Section 16, blocked).

Frontend rules: render model and user text as escaped text; keyboard navigable; focus management; WCAG 2.2 AA as the target; reduced-motion respected; English only; currency shown as in the KB record (no conversion). The browser imports `core` for Layer 1; it never imports server-only modules.

### 12.4 Parity test (spec 4.9; blocks release)
Run the shared fixtures through `core` in Node and in the bundled browser build (headless Chromium via Playwright), and require byte-identical JSON output. Any difference is a bug.

---

## 13. Part B4: The Phase 0 harness (`tools/phase0`, `docs/07-validation/phase-0/`)

CLI commands (each documented, idempotent, and refusing to run real models without `ALLOW_REAL_LLM=1` plus a configured spend cap):

```text
pnpm phase0:scenarios:import <dir>   validate + import scenario JSON (design + context), mark draft
pnpm phase0:scenarios:approve <slug> founder sign-off (sets reviewed_by); only approved scenarios enter the test
pnpm phase0:arms:run [--scenario] [--arms A,B,C] [--fake]   generate arm outputs, store with versions/roster/cost
pnpm phase0:arms:report              word counts, length-tolerance violations, cost per arm, cost per debate
pnpm phase0:raters:create --domain X mint invite tokens (print once, store hash only)
pnpm phase0:assign                   seeded deterministic assignment
pnpm phase0:citations:sample         sample 30 citations from arms B and C → checklist for the founder
pnpm phase0:citations:score <file>   compute share of matching citations from the founder's completed checklist
pnpm phase0:analyse                  H1-H4 report (refuses without a valid pre-registration lock)
pnpm phase0:cost                     measured cost per debate, transcript growth per turn, spend vs cap
pnpm phase0:export                   anonymised ratings CSV
pnpm phase0:purge                    apply the retention schedule
```

**Scenarios.** Golden designs are scenario seeds (spec 15.3). Build the structure, the loader and a first set of **at least 10 synthetic scenarios (target 15-20)** covering the five decision types (e.g. retrieval app on an existing relational database; agent that calls tools; chat app with memory; batch pipeline; small app with a single model provider). Each has expected findings (rule ids, severities), expected confidence, expected number ranges, and a note on what a good verdict says. Scenarios use fixture-or-real KB data consistently; real-data scenarios wait for founder-promoted records. All scenarios require founder approval; the founder must not rate scenarios they authored.

**Assignment.** Each rater gets 6-10 scenarios; arm pair per scenario (A-B, B-C, optionally A-C) balanced across raters; left/right randomised per scenario and per rater; seeded and reproducible; stored at assignment time.

**Pre-registration lock.** `docs/07-validation/phase-0/preregistration.md` drafted by you from spec 17.1 with: hypotheses H1-H4, decision rules (60% preference, p < 0.025 per hypothesis; H1 = B over A, H2 = C over B; H2 does not change the canvas gate), handling of ties and "both wrong" (excluded from the sign test, reported separately), one-sided vs two-sided (draft as a one-sided exact binomial for a directional hypothesis and **flag it for the founder to decide**), minimum judgments (100), the waitlist threshold, the cost cap, blinding steps, and the rule that the founder does not rate scenarios they wrote. The founder signs off; `phase0:lock` writes `preregistration.lock.json` containing the file's SHA-256 and the date. `phase0:analyse` verifies the hash and refuses to run if the file changed after the lock.

**Statistics.** Implement an exact binomial sign test (no normal approximation) plus a 95% CI for the preference rate. Add a unit test that reproduces the spec's sanity check (150 paired judgments at 60% preference; 100 judgments at 60%) and report the exact p-values in the test output. If the spec's "about p ≈ 0.02" differs materially from the exact computation, note it in `docs/05-phases/phase-0/conflicts.md`; do not edit the spec.

**Report** (`docs/07-validation/phase-0/results/`, generated, never hand-edited): H1-H4 outcomes, measured cost per debate, citation accuracy, hours per decision type, secondary measures (trust, time to decide), data-quality notes (position bias check, length-tolerance violations, raters per scenario).

**Waitlist gate metric.** `join_rate = distinct waitlist_join anon sessions ÷ distinct price_viewed anon sessions` computed from `phase0_events`; compared to `gate.waitlist_min_join_rate`. (Privacy: no cookies, no fingerprinting; note in the privacy stub that counsel should confirm.)

---

## 14. Security and privacy (applies to everything above)
- Untrusted text: user labels/notes, pasted text, vendor-page content, and all model output. Length-limit and pass to models only as labelled data blocks; render only as escaped text; Markdown without raw HTML.
- No tools for any model. Nothing a model writes triggers an action.
- Secret redaction (`sk-`, `AKIA`, `ghp_` and similar, defined in `core/security`) before any text is sent to a model or written to a log; R-09 blocks model calls when such text is found in a design.
- Object/ownership checks: rater tokens only see their own assignments; test with cross-token attempts.
- Webhooks (later) verify signatures; none exist in Phase 0.
- Retention defaults from config; `waitlist_signups` and rater data have a documented deletion path.
- Data inventory table started in `docs/06-runbooks/` or `docs/03-specs/privacy-inventory.md`. Do not give legal advice; mark counsel items (EU representative, SCCs for India→EU transfers, logo licences) as Open.
- Keep provider spend caps in provider consoles (founder task); one key per environment.

---

## 15. Testing matrix for this phase

| Layer | What | Blocks release |
|---|---|---|
| Unit (core) | rule fixtures, calculators, validator (adversarial), hashing/normalisation, articulation points, pipeline stages | yes |
| Property | calculator monotonicity, hash invariants, graph helpers | yes |
| Golden | pipeline verdicts, calculator numbers, golden designs | yes |
| Parity | Node vs browser identical output | yes |
| KB | schema, placeholders, quotes in snapshots, expiry, citation resolution | yes |
| LLM (fake client) | debate golden runs, repair path, budget stop, cancel, injection suite | yes |
| Integration | real Postgres: migrations, constraints, idempotent writes, retention | yes |
| API contract | schema snapshots, problem-details shape, rate limiter, rater-token isolation | yes |
| Docs | frontmatter valid, INDEX current, links resolve | yes |
| Licence/security | licence gate, dependency audit, secret scan | yes |
| Smoke | plain pages render with fake data; calculator runs offline | yes |

Definition of done for every feature (spec 15.2): tests pass; analytics events and log fields defined; spec/docs updated with a changelog line (Appendix D of the spec: propose the entry in `docs/05-phases/phase-0/spec-change-proposals.md`, do not edit the spec yourself); every new dependency in the licence register; any model-calling feature reports cost impact and has a cap; keyboard/screen-reader behaviour checked for new interactive elements; features that cost money sit behind a flag.

---

## 16. Blocked or deferred items (build stubs, do not complete)
- **Founding-member (refundable pre-order) checkout**: blocked on the founder's location (Assumption: India) and merchant-of-record choice (Polar/Dodo first, Paddle fallback; Stripe Managed Payments excludes India, per the research report). Build only a `Payments` port with a disabled adapter and a README of required events and pages. Do not integrate any provider.
- **Real KB records**: founder-reviewed via `kb/proposals/` flow.
- **Real model runs**: need roster IDs, gateway key, spend cap (founder).
- **Hosting choice (ADR-029) and the one-week SSE/LISTEN streaming test**: Phase 1 prerequisite, not Phase 0.
- **Pricing numbers, gate thresholds, product name**: founder inputs via `config/phase0.json`.

---

## 17. Milestones and acceptance criteria (execute in order)

**M0: Repo skeleton and docs system**
Create the full tree (Section 4.1), root and nested CLAUDE.md, AGENTS.md, `.claude/{settings,rules,commands,agents,skills}`, docs folders with READMEs, templates, `_meta` schema, `tools/docs-index`, ADR stubs, licence register seeded, `.gitignore`, `.env.example`, `LICENSE`.
*Accept:* `pnpm docs:check` passes; INDEX.md generated; a sample research note dropped in `00-inbox/` is ignored by the validator; `/triage-inbox` command exists; CLAUDE.md < 200 lines and contains every Section 7.1 item.

**M1: Tooling, boundaries, CI**
pnpm workspace, TS strict config, lint/format, test runner, dependency-boundary enforcement, licence gate, notices generator, CI workflow, PR template, docker-compose Postgres, `pnpm ci` script.
*Accept:* CI green on an empty-but-wired repo; an intentional boundary violation (core importing llm) fails CI; an added GPL package fails the licence gate (demonstrate in a throwaway branch, then revert).

**M2: Core types, schemas, hashing**
Section 10.1-10.2.
*Accept:* schemas reject invariant violations I1-I8; hash property tests pass; core has zero forbidden imports (verified by the purity reviewer subagent and a lint rule banning `fs`, `http`, `Date.now`, `Math.random`, `process` in `packages/core`).

**M3: KB package and release checks**
Section 10.6 (schemas, layout, loader, bundle, `kb-check`, `kb-propose`, sweep, fixtures, decision-type YAMLs for the five types).
*Accept:* fixture KB passes checks; each failure mode (placeholder, missing quote in snapshot, expired launch record, dangling citation, wrong TTL) makes `kb:check` fail in tests; fixtures cannot enter a release bundle.

**M4: Pipeline**
Section 10.3 with golden tests.
*Accept:* all outcomes (`verdict`, `needs_context`, `kb_gap`) covered; P9 tests pass; same inputs → byte-identical verdict and hash; per-dimension breakdown stored.

**M5: Rules, graph, calculators**
Section 10.4.
*Accept:* R-01..R-07 + R-09 fixtures pass; Tarjan verified; calculator golden + property tests pass; free-tier behaviours handled per spec 7.6.

**M6: Grounding validator and security helpers**
Section 10.5 + redaction.
*Accept:* every adversarial fixture rejected; G1-G6 each have passing and failing cases.

**M7: LLM layer**
Section 11 (client, fake, OpenRouter adapter behind flags, prompts, Layer 2, debate runner, arms).
*Accept:* debate golden runs, repair, fallback, budget stop, cancel, resume, injection suite all pass on the fake client; real adapter exercised only by an opt-in smoke script with a tiny cap; every call writes a usage row with cost source and price snapshot.

**M8: Database and API**
Section 12.1-12.2.
*Accept:* migrations apply from empty; integration tests green on real Postgres; contract snapshots committed; rater-token isolation test passes; `/v1/verdict` and `/v1/analyze` return correct results for golden designs; rate limiter test passes.

**M9: Web pages**
Section 12.3.
*Accept:* all five page groups work against the API with the fake model client; calculator runs fully offline in the browser; waitlist disabled with a visible banner when the price is `null`; keyboard-only pass of the rating page; CSP verified.

**M10: Phase 0 harness**
Section 13.
*Accept:* end-to-end dry run with the fake client: import scenarios → run arms → create raters → assign → submit ratings via the page → analyse (blocked without lock; works after lock) → citation sample → cost report. Statistical unit tests pass. Report generated into `results/` from fake data and clearly watermarked "FAKE DATA".

**M11: Parity, hardening, handoff**
Section 12.4, load of docs, runbook stubs, `status.md` final, `conflicts.md` and `parking-lot.md` reviewed, spec-change proposals written, ADRs complete, notices generated.
*Accept:* full `pnpm ci` green; parity test green; founder checklist (below) delivered.

**Founder handoff checklist (deliver at the end, in `docs/05-phases/phase-0/status.md`):** how to run everything locally; what the founder must supply (roster ids, gateway key, spend caps, price, thresholds, approved scenarios, promoted KB records); the exact sequence to run the blind test; list of Open items still blocking Phase 1; list of every deviation from the spec (ADR-032 and others).

---

## 18. Questions to ask the founder at the very start (post these before coding)

BLOCKING (cannot proceed on the affected milestone without an answer):
1. **Which five decision types are in Phase 0?** (Proposed: vector-store, database, cache, queue, model-access.) Needed by M3.
2. **Second model provider:** the blueprint says "jev", read as Gemini. Is Claude included? Is OpenRouter the Phase 0 gateway (ADR-014)? Needed before real arm runs (M7/M10), not before building.
3. **Where is the founder based?** (Assumption: India.) Only affects the deferred checkout; confirm before M10 ends.

NON-BLOCKING (use the default, log it as an Assumption):
4. Repo owner name for the LICENSE notice (default: placeholder).
5. Linter choice (ESLint+Prettier vs Biome) and test runner (default Vitest).
6. Frontend framework (default: Vite + React Router with prerender; ADR-030).
7. Waitlist displayed price and period, gate thresholds, spend cap (left `null`; tools refuse to run).
8. Product name (default: working name; package scope `@product/*` per spec).

---

## 19. Final reminders
- Nothing here is permission to expand scope. If something is not in this brief, it is parked.
- Never present a model's text as fact. Facts come from `kb/` records with source, quote, verified date and expiry.
- Missing or stale data makes a verdict uncertain; it never quietly removes an option.
- Update `status.md` before you stop. Leave the repo green.