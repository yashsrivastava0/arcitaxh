---
title: "Phase 0 status and handoff"
category: phases
type: plan
status: draft
tags: [phase-0, status, handoff]
created: 2026-10-18
updated: 2026-10-18
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
| M5 | Rules R-01..R-07 and R-09, graph helpers, calculators | next |
| M6-M11 | | not started |

## Next

M5: graph helpers (adjacency, cycles, topological sort, articulation points by Tarjan, tested on cycles, disconnected graphs and a single node), rules R-01..R-07 and R-09 with at least two fixtures each, `security/redact`, and the calculators (cost per request and per month with exact money, the latency algorithm with p50/p95 and the "conservative upper bound" label, scale presets 1x/10x/100x, and the typed free-tier behaviours). Golden numbers to the last digit, property tests, and `RULES_VERSION` as the aggregate of rule versions.

## Blockers and questions

See [questions.md](./questions.md). Q1 (five decision types) limits M3 to `vector-store`; Q2 and Q3 do not block building.

## Environment notes

- Machine Node is 25.1.0; scripts run on a pnpm-downloaded Node 24.22.0 (`devEngines.runtime`). Run `pnpm install` once after cloning.
- Use `pnpm run ci`, never bare `pnpm ci` (pnpm 12 built-in: deletes node_modules).
- TypeScript is pinned to 6.0.3 (ADR-035).
- The four untracked files in the repo root (`PLAN1.MD`, `PLAN2.MD`, two copies of the source documents) are yours; the source documents are already in `docs/01-source/`.
- Node on the dev machine is 25.1.0 (non-LTS); the repo pins 24.22.0 (LTS).
- pnpm 12.14.0 installed globally.
- Git: this repo is `ANIMAX/` (branch `main`). The enclosing home-directory repo is unrelated.
