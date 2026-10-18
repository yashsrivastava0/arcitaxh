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
| M3 | KB package, loader, bundle, checks, fixtures | in progress: `packages/kb` release logic done (39 tests); tools, bundle reader, fixtures, decision type still to do |
| M4-M11 | | not started |

## Next

Finish M3: KB bundle schema and pure bundle-backed `KBReader` in core; `tools/kb-check`, `kb-build`, `kb-propose`, `kb:sweep`; JSON Schema generation; `vector-store` decision type; fake fixture KB; CHANGELOG. Only `vector-store` is authored until question 1 is answered.

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
