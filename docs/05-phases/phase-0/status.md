---
title: "Phase 0 status and handoff"
category: phases
type: plan
status: draft
tags: [phase-0, status, handoff]
created: 2026-10-18
updated: 2026-10-19
verified_on: null
author: agent
sources: []
supersedes: []
related: ["plan.md", "questions.md", "conflicts.md", "parking-lot.md"]
confidence_tags: [Recommendation]
---

# Phase 0 status

Updated at the end of every session. Read this first when resuming.

## Where we are

- Session 1 (2026-10-18): source documents located and copied to `docs/01-source/`; all three read; plan, conflicts, questions and parking lot written. M0 complete: repo skeleton, docs system (`pnpm docs:check` / `docs:index`), 34 ADRs (001-031 mirrored, 032-034 new), licence register seeded (59 spec rows plus verified packages), root and nested CLAUDE.md, `.claude/` rules, commands, agents, skills and settings.
- Session 1, M1 done: Vitest 5, ESLint 10 + Prettier, dependency-cruiser, licence gate (`tools/licences`), notices generator, secret scan, CI workflow (SHA-pinned actions), PR template, Postgres 18 compose (host port 5433, 512 MB cap). `pnpm run ci` is green locally (typecheck, lint, boundaries, 45 tests, audit, secrets, licences, notices, docs). The GitHub workflow itself has NOT run: there is no remote yet. Acceptance demos done on a throwaway branch and reverted: core importing llm and `node:fs` fails `check:boundaries` and lint; a package with a GPL licence fails `licences:check`.

## Milestones

| # | Milestone | State |
|---|---|---|
| M0 | Repo skeleton, docs system, agent config | done (acceptance checked 2026-10-18) |
| M1 | Tooling, boundaries, licence gate, CI | done (acceptance checked 2026-10-18; workflow not yet run on GitHub) |
| M2 | Core types, schemas, hashing | done (102 core tests; independent purity review found no violations; enforcement hardened, see ADR-037) |
| M3 | KB package, loader, bundle, checks, fixtures | done except the four extra decision types, which wait for question 1 (acceptance checked: fixture KB passes; placeholder, missing quote, expired launch record, dangling reference and wrong TTL each fail `kb:check` in tests; fixtures cannot enter a bundle) |
| M4 | Six-stage pipeline with golden tests | done (acceptance checked: all three outcomes; E-1 to E-6; the deferral option; P9 incl. properties and a mutation check; partial score; byte-identical verdict and hash; per-dimension breakdown stored). See ADR-041 for the interpretations I made |
| M5 | Rules R-01..R-07 and R-09, graph helpers, calculators | IN PROGRESS; changes committed locally for publishing, CI not run (see Next) |
| M6-M11 | | not started |

## Next

### Session handoff (M5 in progress; publishing handoff)

State: M0-M4 are committed through `974ad5f`. M5 implementation files are now committed locally in feature-sized changes for publication. The supplied GitHub remote was empty on initial check and is configured as `origin` for the pending push. **M5 has not passed `pnpm run ci`.** The previous handoff recorded three failing rules tests; this publishing task does not include a test run.

M5 implementation components and recorded status:

| Piece | Files (under `packages/core/src/`) | Tests |
|---|---|---|
| Graph helpers: adjacency, cycles, SCC, topological order, articulation points (iterative Tarjan), components-without | `graph/graph.ts` | 17 pass |
| Request path: entry points, on-path inference | `graph/request-path.ts` | none of its own yet (covered through R-04, latency) |
| Secret detection and redaction | `security/redact.ts` | 32 pass |
| Latency calculator (7.4) | `calc/latency.ts` | 25 pass |
| Cost calculator (7.5), exact bigint money | `calc/cost.ts` | 20 pass |
| Free tier, typed behaviours, 1x/10x/100x (7.6, 7.7) | `calc/scale.ts` | 17 pass |
| Rules R-01..R-10 (R-08, R-10 optional; R-11 not built), registry, fixtures builders | `rules/*.ts`, `rules/fixtures/builders.ts` | `rules/rules.test.ts`: 89 tests, **86 pass, 3 FAIL** |
| Moved `pipeline/records.ts` to `kb-records.ts` (imports fixed, pipeline tests still 46/46) | `kb-records.ts` | - |
| New optional traits `holdsConversation`, `contextPolicy` (for R-03) | `schemas/design.ts` | - |
| Test builders `latencyRecord`, `limitRecord`, `priceRecord`, `EXPIRED` | `test/helpers.ts` | - |

**The 3 failing tests are real leaks, found by the new tests, not test mistakes:**
1. Rules interpolate a user label straight into finding text (`r01:27`, `r02:33`, `r03:25`, `r04:61-67`, `r05:49`, `r07` `label`, `r08:29`), so a pasted key in a label is echoed. Only `nameList()` redacts. Fix: add `safeLabel()` (redactSecrets + clip) to `rules/types.ts` and use it at every one of those places (and in `labelOf` in R-06).
2. R-09 reports twice for one component when its id and label both look like a secret. Fix: group matches by location, one finding per location (`component "x" (id, label)`, `matches` = number of strings that matched). Fixture expectations (`matches: 1`, `component "api" (label)`) stay valid.

Remaining M5 steps, in order:
1. Apply the two fixes above; rerun `pnpm exec vitest run packages/core/src/rules`.
2. Export the new modules from `packages/core/src/index.ts` (graph, request-path, redact, latency, cost, scale, rules registry and types).
3. Add `graph/request-path.test.ts` (entry points with and without a client, `onRequestPath` true/false, async edges).
4. `pnpm format`, then `pnpm run ci`. Watch for: ESLint core-purity rules, depcruise `core-no-test-code-in-production` (rules must not import `test/`), `secrets:scan` on test files (fake keys are built from fragments), `licences:check`/`notices:check` (no new deps expected).
5. Docs: ADR-042 (rules, calculators, interpretations); conflicts C-018 (rule `check` takes one input object incl. usage and defaults), C-019 (traits for R-03), C-020 (R-04 literal articulation points vs spec C.1, which flags only the leaf database); plan assumption A13 (cache = read-through or cache-aside; hops: same-region default, unknown region counted as default and stated, known different regions = unknown hop because the KB has no region-pair table, client network time not counted, branches parallel; overage price = USD per_unit price named after the metric; design traits are closed-world declarations: absent = not declared); spec-change-proposals (traits, rule contract, hop figures have p50 and p95 in C.3 but the default here is one number); parking-lot (R-11 needs embedding-dimension fields; "removing a cache never lowers read-path cost" cannot be tested because spec 7.3 has no cache-hit-ratio input); update this status.md.
6. M5 code is committed in feature-sized Conventional Commits. The founder's publication request includes `PLAN1.MD`, `PLAN2.MD` and the duplicate source Markdown at the repo root; exclude only `Decision canvas architecture spec.pdf`.

After M5: M6 grounding validator G1-G6 + adversarial suite; M7 LLM layer (read spec Appendix A, verify AI SDK types first; extend `purpose` for arm A, C-003); M8 `packages/db` + `apps/api`; M9 `apps/web` pages; M10 `tools/phase0` harness (Q3 before it ends); M11 parity test, privacy inventory, runbooks, final handoff checklist.

Working notes for the next session:
- Prefer the Edit and Write tools. Large bash heredocs and scripted string replacement have broken twice; small Python edits with `python -P` are fine. Prettier reformats files after `pnpm format`, so re-read a file before an Edit that depends on its exact text.
- `pnpm run ci` (not `pnpm ci`). Expected full-CI baseline before M5: 387 tests green.
- Open founder questions are unchanged: Q1 (five decision types), Q2 (second model provider), Q3 (founder location) are blocking; Q4-Q10 use defaults. Pre-registration test sidedness (C-005) still needs a founder decision.

## Blockers and questions

See [questions.md](./questions.md). Q1 (five decision types) limits M3 to `vector-store`; Q2 and Q3 do not block building.

## Environment notes

- Machine Node is 25.1.0; scripts run on a pnpm-downloaded Node 24.22.0 (`devEngines.runtime`). Run `pnpm install` once after cloning.
- Use `pnpm run ci`, never bare `pnpm ci` (pnpm 12 built-in: deletes node_modules).
- TypeScript is pinned to 6.0.3 (ADR-035).
- The founder requested publishing the root planning files and duplicate source Markdown. `Decision canvas architecture spec.pdf` is excluded; the canonical source files remain under `docs/01-source/`.
- Node on the dev machine is 25.1.0 (non-LTS); the repo pins 24.22.0 (LTS).
- pnpm 12.14.0 installed globally.
- Git: this repo is `ANIMAX/` (branch `main`). The enclosing home-directory repo is unrelated.
