---
title: "ADR-036: Test runner Vitest"
category: decisions
type: decision
status: draft
tags: [adr, phase-0, tooling, testing]
created: 2026-10-18
updated: 2026-10-18
verified_on: 2026-10-18
author: agent
sources: ["https://registry.npmjs.org/vitest"]
supersedes: []
related: ["../03-specs/licence-register.md", "0035-lint-format-and-typescript-pin.md"]
confidence_tags: [Recommendation, Verified]
adr: "ADR-036"
adr_status: "Recommendation"
---

# ADR-036: Test runner Vitest

Status: **Recommendation** (brief default: Vitest).

## Context and Problem Statement

One runner for unit, golden, property (fast-check glue, added in M2), integration and the web smoke test, working with TypeScript source that is exported without a build step (ADR-032).

## Decision Outcome

**Vitest 5.0.5** (MIT, read from the installed package). One Node project at the repo root includes `packages/*/src/**/*.test.ts`, `tools/*/src/**/*.test.ts` and `apps/*/src/**/*.test.ts`; `passWithNoTests` keeps an empty package green. The web app gets its own jsdom project in M9. Integration tests use real PostgreSQL, never a mock.

Vitest 5 brings Vite 8 and Rolldown as transitive dependencies. Both are MIT. `lightningcss` (MPL-2.0) and `minimatch` (BlueOak-1.0.0) also arrive as dev-only transitives; they are handled in ADR-038.

### Consequences

* Good: fast, native TypeScript, same config for Node and later the web app.
* Bad: Vitest 5 is new; its plugin ecosystem is smaller than older majors.

### Confirmation

`pnpm test` and `pnpm test:core` in CI; tests may not call a real model, the network or depend on the wall clock (`.claude/rules/testing.md`).
