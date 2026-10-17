---
title: "Phase 0 questions for the founder"
category: phases
type: note
status: draft
tags: [phase-0, questions]
created: 2026-10-18
updated: 2026-10-18
verified_on: null
author: agent
sources: []
supersedes: []
related: ["plan.md", "conflicts.md"]
confidence_tags: [Open, Assumption]
---

# Questions

## Blocking

| # | Question | Needed by | Default if unanswered | Status |
|---|---|---|---|---|
| 1 | Which five decision types are in Phase 0? Proposed: `vector-store`, `database`, `cache`, `queue`, `model-access`. | M3 | Only `vector-store` is authored until answered. | Open |
| 2 | Second model provider: "jev" read as Gemini. Is Claude included? Is OpenRouter the Phase 0 gateway (ADR-014)? | Real arm runs (M7/M10) | Building proceeds with the fake client. | Open |
| 3 | Where is the founder based? (Assumed India.) | End of M10 | Checkout stays a disabled port. | Open |

## Non-blocking (defaults in use, logged as assumptions in plan.md)

| # | Question | Default |
|---|---|---|
| 4 | Repo owner name for the LICENSE notice | Placeholder |
| 5 | Linter (ESLint + Prettier vs Biome) and test runner | ESLint + Prettier, Vitest |
| 6 | Frontend framework (ADR-030) | Vite + React Router |
| 7 | Waitlist price and period, gate thresholds, spend cap | `null`; tools refuse to run |
| 8 | Product name | Working name; scope `@product/*` |
| 9 | Freshness TTL (days) for `option`, `tradeoff`, `flip` and `antipattern` records; the spec specifies only price, limit, rate-limit, capability, latency profile and guidance (plan A10). | None. The KB release check fails with a clear message for a type without a TTL, and fixtures are unaffected. |

## Needed from the founder before the blind test

Roster model ids and gateway key, spend caps (also set in the provider console), displayed price and period, gate thresholds, approved scenarios, promoted KB records, sign-off of the pre-registration (including one-sided vs two-sided, see conflicts.md C-005).
