---
title: "Phase 0 plan: foundation and validate the engine"
category: phases
type: plan
status: draft
tags: [phase-0, plan, milestones]
created: 2026-10-18
updated: 2026-10-18
verified_on: null
author: agent
sources: []
supersedes: []
related: ["status.md", "conflicts.md", "questions.md", "parking-lot.md", "../../01-source/blueprint.pdf", "../../01-source/architecture-specification-v0.1.pdf", "../../01-source/decision-canvas-build-vs-buy.md"]
confidence_tags: [Recommendation, Assumption]
---

# Phase 0 plan

Written after reading the blueprint (all), the research report (all) and the specification (sections 0-8, 9.1-9.7, 10, 11, 14.3, 15, 16, 17, 19, 21-23 and Appendices B-E). Not yet read in detail, and read when a milestone needs them: sections 9.8-9.10 (exports, alerts, MCP; out of scope), 12 (streaming; out of scope), 13 (security and privacy; read for M8/M11), 14.1-14.2 and 14.4-14.9 (ops), 18 (economics), 20 (risks) and Appendix A (verified facts; read for M7).

Precedence: a Decision in the blueprint, then the specification, then the research report. Conflicts are in [conflicts.md](./conflicts.md).

## Goal

Part A: a production-grade monorepo, a docs system, agent configuration, tooling, CI and a licence gate. Part B: the Phase 0 engine (pure TypeScript core, KB system, LLM layer, minimal API, plain web pages, the three-arm blind-test harness). Phase 0 is done when every milestone's acceptance criteria pass, CI is green and `status.md` says so. It is not "done" when the blind test passes; the founder runs that test.

Out of scope, and no dependencies installed for them: canvas / React Flow, drawer, ghost nodes, numbers strip and slider UI, Better Auth, saved designs, credit ledger and billing, SSE and debate theatre, pg-boss, alerts, exports, MCP, GitHub App, Yjs.

## Milestones, in order

| # | Milestone | Depends on | Blocked by |
|---|---|---|---|
| M0 | Repo skeleton, docs system, agent configuration | none | none |
| M1 | Tooling, dependency boundaries, licence gate, CI | M0 | none |
| M2 | Core types, schemas, normalisation, hashing | M1 | none |
| M3 | KB package, loader, bundle, release checks, fixtures, decision types | M2 | Q1 for the four types beyond `vector-store` |
| M4 | Six-stage pipeline with golden tests | M2, M3 | none |
| M5 | Rules R-01..R-07 and R-09, graph helpers, calculators | M2 | none |
| M6 | Grounding validator G1-G6 and security helpers | M2, M5 | none |
| M7 | LLM layer: client, fake, OpenRouter adapter, prompts, Layer 2, debate runner, arms | M4, M6 | Q2 only for real runs |
| M8 | Database and API | M4, M7 | none |
| M9 | Web pages | M8 | none |
| M10 | Phase 0 harness | M7, M8, M9 | Q3 before the milestone ends |
| M11 | Parity, hardening, handoff | all | none |

Each milestone is one branch-sized unit: small Conventional Commits, tests first for the core, and the next milestone does not start until the current one's acceptance criteria pass. Acceptance criteria are Section 17 of the brief.

Note on order: M5 and M6 need only the core types and the `KBReader` port, so they could run before M3. The brief's order is kept unless M3 stalls.

## Assumptions made (log; none is a fact)

| # | Assumption | Source of the default | Revisit when |
|---|---|---|---|
| A1 | Repository is its own git repo at `ANIMAX/`, branch `main`. The enclosing home-directory repo is not touched. | This plan | Founder objects |
| A2 | Node 24 LTS (`24.22.0`, released 2026-10-14) is pinned in `.nvmrc` and `engines`. The local Node is 25.1.0 (a Current, non-LTS release) and still works. | Brief 4: "current LTS at build time" | LTS changes |
| A3 | pnpm 12.14.0 (MIT), installed globally on the dev machine. Scripts run on a Node 24.22.0 runtime that pnpm downloads into `node_modules` (`devEngines`), because the machine has Node 25.1.0 and dependency-cruiser refuses it (ADR-033). | Brief 4 | - |
| A4 | Test runner Vitest; linter ESLint + Prettier. RESOLVED in M1: TypeScript is pinned to 6.0.3 because typescript-eslint supports only below 6.1 (ADR-035, ADR-036). | Brief 8.1, Q5 | typescript-eslint supports TypeScript 7 |
| A5 | Frontend is Vite + React + React Router, plain pages, marketing routes prerendered later (ADR-030 stays "Recommendation, pending founder"). | Brief 12.3, Q6 | Founder decides |
| A6 | LICENSE owner is a placeholder. Package scope `@product/*`. Product name stays "working name". | Brief Q4, Q8 | Founder names the product |
| A7 | Internal packages export TypeScript source (`exports: ./src/index.ts`) and are consumed by Vite, Vitest and tsx directly; module resolution is `Bundler`. No build step for libraries. | This plan | A consumer needs plain Node ESM output |
| A8 | `phase0.json` price, period, spend cap and `model-roster.json` ids are left `null` / `__FOUNDER_TO_SET__`; tools refuse to run on them. | Brief 9, Q7 | Founder fills them |
| A9 | Founder location is India for the deferred checkout; no provider is integrated. | Brief 16, Q3 | Q3 answered |
| A10 | The specification gives freshness TTLs for price, limit, rate-limit, capability, latency profile and guidance, but none for `option`, `tradeoff`, `flip` and `antipattern` records. Open: M3 will not guess. The release check treats a record type with no TTL entry as a configuration error until the founder picks values. | Spec 8.4 | Founder answers (question 9 in questions.md) |
| A11 | Config values the specification does NOT give, set as Defaults in `config/` and marked Assumption in each file's `_status`: operational_simplicity table (ops_burden low/medium/high 1.0/0.6/0.2 times a deployment factor 1.0/0.9/0.7), latency_fit values (comfortable ratio 0.5; 1.0/0.6/0.0), same-region hop 5 ms, edge bound 600, note length 500, retry back-off 500 ms times 2, `ops_burden` allowed values, the free-tier horizon of 12 months as a config value. None is a fact; all are tunable without a deploy. | Needed to implement the six dimension functions (6.5) | Tuned in Phase 0, or the founder sets them |

## Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | The TypeScript line in the registry is 7.x; tools may not support it. **Materialised in M1**: typescript-eslint caps at below 6.1, so TypeScript is pinned to 6.0.3 (ADR-035). | Revisit when typescript-eslint adds TypeScript 7. |
| R2 | Low-RAM Windows machine. Docker Postgres (M8) and Chromium (M11) are heavy. | Run them one at a time. CI uses a service container. Never restart Docker unasked. |
| R3 | The brief and the spec differ in small ways (section cross-references, an endpoint path, what `kb/fixtures` holds). | Logged in conflicts.md. None affects scope, cost or licences. |
| R4 | There are no real KB records until the founder promotes proposals. Real-data scenarios cannot exist yet. | Fake `vendor.example` fixtures for all tests; scenarios marked fixture-data until records are promoted. |
| R5 | The AI SDK 7 API may differ from the spec's description. | Read the installed package's types before writing the adapter. The adapter is the only file that imports it. |
| R6 | Twelve milestones is a lot of surface, and the canvas is tempting. | Anything outside brief section 1 goes to parking-lot.md and is not built. |
| R7 | A p-value rule written as "60% and p below 0.025" behaves differently one-sided versus two-sided (see conflicts.md C-005). | Draft one-sided as the brief says and flag it for the founder before the lock. |

## Questions for the founder

BLOCKING (see [questions.md](./questions.md) for the live list):

1. Which five decision types are in Phase 0? Proposed: `vector-store`, `database`, `cache`, `queue`, `model-access`. Until answered, only `vector-store` (the vertical slice, and the blueprint's flagship example) is authored in M3.
2. Second model provider ("jev" read as Gemini; is Claude included? is OpenRouter the Phase 0 gateway?). Needed before real arm runs, not before building.
3. Founder location (assumed India). Needed before M10 ends; affects only the deferred checkout.

Non-blocking, proceeding on the defaults in the assumptions table: LICENSE owner, linter and runner, frontend framework, displayed price and thresholds (left `null`), product name.
