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

## Milestones

| # | Milestone | State |
|---|---|---|
| M0 | Repo skeleton, docs system, agent config | done (acceptance checked 2026-10-18) |
| M1 | Tooling, boundaries, licence gate, CI | next |
| M2-M11 | | not started |

## Next

M1: Vitest, ESLint + Prettier (or Biome if typescript-eslint cannot support TypeScript 7), dependency-cruiser, licence gate and notices generator, CI workflow, PR template, docker-compose Postgres, `pnpm ci`. Add unit tests for `tools/docs-index` (ADR-034 promises them).

## Blockers and questions

See [questions.md](./questions.md). Q1 (five decision types) limits M3 to `vector-store`; Q2 and Q3 do not block building.

## Environment notes

- Node on the dev machine is 25.1.0 (non-LTS); the repo pins 24.22.0 (LTS).
- pnpm 12.14.0 installed globally.
- Git: this repo is `ANIMAX/` (branch `main`). The enclosing home-directory repo is unrelated.
