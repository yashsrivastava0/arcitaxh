---
title: "ADR-035: Lint, format and the TypeScript pin"
category: decisions
type: decision
status: draft
tags: [adr, phase-0, tooling]
created: 2026-10-18
updated: 2026-10-18
verified_on: 2026-10-18
author: agent
sources: ["https://registry.npmjs.org/typescript-eslint"]
supersedes: []
related: ["0033-package-manager-and-runtime-pins.md", "0037-dependency-boundary-enforcement.md", "../03-specs/licence-register.md"]
confidence_tags: [Recommendation, Verified]
adr: "ADR-035"
adr_status: "Recommendation"
---

# ADR-035: Lint, format and the TypeScript pin

Status: **Recommendation**, pending the founder (brief question 5: linter choice; default not specified).

## Context and Problem Statement

The brief asks for ESLint + Prettier or Biome (choose one, record why) and strict TypeScript. The registry's `latest` TypeScript is **7.0.2** (published 2026-07-08), but `typescript-eslint` 8.71.2 declares the peer range `typescript >=4.8.4 <6.1.0` (read from the registry on 2026-10-18). They cannot both be used.

## Considered Options

* ESLint + Prettier with TypeScript pinned to the newest release inside typescript-eslint's range (6.0.3, Apache-2.0, 2026-04-16).
* Biome with TypeScript 7.0.2 (Biome needs no TypeScript peer).
* ESLint + typescript-eslint with TypeScript 7 anyway (unsupported; rejected).

## Decision Outcome

Chosen: **ESLint + Prettier, TypeScript pinned to exactly 6.0.3.**

* Brief 4.3 and M2 explicitly ask for ESLint rules (`no-restricted-imports`, and bans on `Date.now`, `Math.random`, `process`, `fs`, `http` in `packages/core`). ESLint expresses all of them directly (`no-restricted-properties`, `no-restricted-syntax`, `no-restricted-globals`); Biome does not cover property-level bans without plugins.
* TypeScript is pinned exactly (no caret) so it cannot drift past the supported range. This was a deliberate step down from the 7.0.2 that was first installed; nothing was built on 7.
* Lint runs the non-type-aware `typescript-eslint` recommended set (fast on a low-RAM machine); `tsc --noEmit` does the type checking.

### Consequences

* Good: the purity and boundary rules are enforced in CI, with dependency-cruiser as the primary net (ADR-037).
* Bad: no TypeScript 7 speed-up and no TS 7 language features until typescript-eslint supports it.

### Confirmation

`pnpm lint` and `pnpm typecheck` in CI. **Revisit** when a typescript-eslint release lists TypeScript 7 in its peer range: bump TypeScript, re-run CI, and supersede this ADR.
