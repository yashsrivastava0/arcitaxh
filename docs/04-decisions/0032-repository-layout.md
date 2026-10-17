---
title: "ADR-032: Repository layout"
category: decisions
type: decision
status: draft
tags: [adr, phase-0, layout]
created: 2026-10-18
updated: 2026-10-18
verified_on: null
author: agent
sources: []
supersedes: []
related: ["0006-modular-monolith-with-two-processes.md", "0016-knowledge-base-as-versioned-yaml-in-git-loaded-to-postgres.md", "../05-phases/phase-0/conflicts.md", "../01-source/architecture-specification-v0.1.pdf"]
confidence_tags: [Recommendation]
adr: "ADR-032"
adr_status: "Recommendation"
---

# ADR-032: Repository layout

Status: **Recommendation**, pending the founder.

## Context and Problem Statement

The specification (5.3) lists `packages/core`, `kb`, `llm` and `apps/web`, `api`, `worker`. Phase 0 also needs shared database adapters, command-line tools, configuration for every Default value, and a place for KB content.

## Considered Options

* Exactly the specification's package list, with everything else inside apps.
* The specification's list plus `packages/db`, `tools/`, `config/`, a root-level `kb/`, and `packages/tsconfig`.

## Decision Outcome

Chosen: the second option.

* `packages/db`: Drizzle schema, migrations and repository adapters, shared by the API and the future worker. The adapters-in-apps rule of specification 5.3 becomes adapters-in-`packages/db` plus per-app wiring.
* `tools/`: CLIs and scripts (docs index, KB checks and build, KB proposal helper, Phase 0 harness, licence gate, notices). Never imported by an app or package.
* `config/`: every Default value in `config/defaults/*.json`, validated by a Zod schema in `core` at start-up; `phase0.json` and `model-roster.json` for the founder to fill.
* `kb/` at the repository root: KB content lives in the monorepo for Phase 0. It can move to its own git repository later; release tags keep the `kb-YYYY.MM.N` form.
* `packages/tsconfig`: shared TypeScript presets extending the root `tsconfig.base.json`.
* `kb/fixtures/` holds FAKE KB records for tests (the brief's meaning). The specification's "golden designs" live in `packages/core/src/test/golden/` (conflicts.md C-006).
* Internal packages export TypeScript source (`exports: ./src/index.ts`) and are consumed by Vite, Vitest and tsx directly, with `moduleResolution: Bundler`; there is no build step for libraries. Revisit if a consumer needs plain Node ESM output.

### Consequences

* Good: later phases slot in without restructuring (growth plan in `docs/05-phases/README.md`).
* Good: dependency direction is easy to enforce (`core` imports nothing; `tools/` is imported by nothing).
* Bad: one more package than the specification names, and KB content in the same repository as code until it is split.

### Confirmation

`pnpm check:boundaries` (dependency-cruiser) plus an ESLint import-restriction rule enforce the direction rules in CI. A deliberate boundary violation (core importing llm) must fail CI.
