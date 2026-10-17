---
title: "ADR-010: PostgreSQL as the only data store; no Redis"
category: decisions
type: decision
status: draft
tags: [adr, phase-0, phase-0-touched]
created: 2026-10-18
updated: 2026-10-18
verified_on: null
author: agent
sources: []
supersedes: []
related: ["../01-source/architecture-specification-v0.1.pdf"]
confidence_tags: [Recommendation]
adr: "ADR-010"
adr_status: "Recommendation"
---

# ADR-010: PostgreSQL as the only data store; no Redis

Status: **Recommendation** (as recorded in specification v0.1, section 19).

## Context and Problem Statement

Mirrored from the decision log of [architecture specification v0.1](../01-source/architecture-specification-v0.1.pdf), section 19. Source: Research report.

Rationale given there: Fewer parts; queue and events fit Postgres.

## Decision Outcome

PostgreSQL as the only data store; no Redis. Proposed, not yet confirmed. Ask before changing it in a way that affects scope, cost or licences.

### Consequences

Phase 0 relevance: touched. 

Stub only. Expand when this decision is acted on or revisited (use `/new-adr` for new decisions).
