---
title: "ADR-034: Docs registry and frontmatter tooling"
category: decisions
type: decision
status: draft
tags: [adr, phase-0, docs]
created: 2026-10-18
updated: 2026-10-18
verified_on: null
author: agent
sources: []
supersedes: []
related: ["0032-repository-layout.md", "../03-specs/licence-register.md", "../_meta/README.md"]
confidence_tags: [Recommendation]
adr: "ADR-034"
adr_status: "Recommendation"
---

# ADR-034: Docs registry and frontmatter tooling

Status: **Recommendation**.

## Context and Problem Statement

The founder will add hundreds of research notes over months. Agents must find the right three without loading the other three hundred, and every fact must stay traceable.

## Considered Options

* A static-site or docs framework. Heavy; adds dependencies for no Phase 0 benefit.
* A small TypeScript script with a YAML parser and a JSON Schema validator.

## Decision Outcome

Chosen: the script, `tools/docs-index`, using `yaml` (ISC) and `ajv` (MIT).

* Frontmatter is validated against `docs/_meta/frontmatter.schema.json`; `category` must equal the folder's category (`docs/_meta/categories.json`); dates must be real; `supersedes` and `related` targets and relative body links must resolve.
* `docs/INDEX.md` is generated deterministically (no timestamps) and CI fails if it is stale.
* `00-inbox/`, `_archive/`, `_templates/` and `_meta/` are ignored. `01-source/` is registry-only: its files are listed in the index but carry no frontmatter, so the canonical documents are never edited. `README.md`, `INDEX.md` and `CLAUDE.md` need no frontmatter but their links are checked.
* The category enum lives in both the schema and `categories.json`; the tool fails if they disagree.

### Consequences

* Good: painless filing (`/triage-inbox`), cheap CI check, no framework.
* Bad: a hand-rolled link checker (relative links only; anchors are not checked).

### Confirmation

`pnpm docs:check` in CI. Unit tests (added with Vitest in M1) cover bad frontmatter, wrong category, broken links, missing targets and a stale index.
