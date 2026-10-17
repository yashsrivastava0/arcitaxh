---
title: "ADR-033: Package manager and runtime pins"
category: decisions
type: decision
status: draft
tags: [adr, phase-0, tooling]
created: 2026-10-18
updated: 2026-10-18
verified_on: 2026-10-18
author: agent
sources: ["https://nodejs.org/dist/index.json", "https://registry.npmjs.org/pnpm"]
supersedes: []
related: ["0032-repository-layout.md", "../03-specs/licence-register.md"]
confidence_tags: [Recommendation, Verified]
adr: "ADR-033"
adr_status: "Recommendation"
---

# ADR-033: Package manager and runtime pins

Status: **Recommendation** (the brief recommends pnpm workspaces; Node "current LTS at build time").

## Context and Problem Statement

A pnpm monorepo, a pinned Node and a pinned package manager are needed so installs are reproducible. Versions must be read from the registry, not remembered.

## Decision Outcome

* **pnpm 12.14.0** (MIT), read from the registry on 2026-10-18; pinned in `package.json#packageManager`. Installed globally on the dev machine (`corepack` is not shipped with the local Node).
* **Node 24.22.0** (the LTS "Krypton" line, released 2026-10-14 per `nodejs.org/dist/index.json`); pinned in `.nvmrc`, with `engines.node >= 24.22.0`. The local machine runs Node 25.1.0, a Current (non-LTS) release; it works but is not the target.
* **TypeScript 7.0.2** (Apache-2.0), the registry's `latest`; `@types/node` is pinned to the 24 line to match the Node target.
* **Dependency build scripts** are blocked by default in pnpm 12. They are approved by package name only (`pnpm approve-builds <pkg>`, never `--all`), recorded in `pnpm-workspace.yaml` (`allowBuilds`). Approved so far: `esbuild` (MIT; the standard binary check), pulled in by `tsx`.
* Turborepo is not added: build times do not justify it yet (check its licence first if that changes).

### Consequences

* Good: reproducible installs; supply-chain scripts need an explicit, reviewable approval.
* Bad: TypeScript 7 is new; the lint and test tools must support it (plan risk R1). The choice is revisited in the lint/test ADRs.

### Confirmation

CI uses `pnpm install --frozen-lockfile` on the `.nvmrc` Node version. `pnpm licences:check` covers every installed package.
