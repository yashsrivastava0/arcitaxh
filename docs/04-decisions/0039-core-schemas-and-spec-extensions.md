---
title: "ADR-039: Core schemas, normalisation and the spec extensions they needed"
category: decisions
type: decision
status: draft
tags: [adr, phase-0, core, schemas, hashing]
created: 2026-10-18
updated: 2026-10-18
verified_on: null
author: agent
sources: []
supersedes: []
related: ["0007-typescript-end-to-end-with-a-pure-shared-core.md", "0028-semantic-caching-is-not-used.md", "0032-repository-layout.md", "0037-dependency-boundary-enforcement.md", "../05-phases/phase-0/conflicts.md", "../01-source/architecture-specification-v0.1.pdf"]
confidence_tags: [Recommendation, Assumption]
adr: "ADR-039"
adr_status: "Recommendation"
---

# ADR-039: Core schemas, normalisation and the spec extensions they needed

Status: **Recommendation**, pending the founder. Implements brief 10.1 and 10.2 (milestone M2).

## Context and Problem Statement

`packages/core` must hold the exact shapes of specification sections 5.2 to 5.7 with Zod as the source of truth, plus canonical JSON and the inputs hash, with no I/O. Implementing them exposed places where the specification's own listings are incomplete or inconsistent.

## Decision Outcome

* **Zod 4 schemas are the source of truth**; TypeScript types are inferred. Every object schema is `strict`: an unknown key is an error, so nothing can be smuggled into a verdict input.
* **Design limits are parameters**, not constants. `createDesignGraphSchema(limits)` takes `maxComponents`, `maxEdges`, `maxLabelChars`, `maxNoteChars` from `config/defaults/rules.json`. Invariants I1, I2, I3, I7 are checked in one pure function (`checkInvariants`) used by the schema and exported; I8 is the schema's length limits; I5 is guaranteed by normalisation; I6 (cycles allowed) is tested; I4 (option exists in the KB) is reported by `findUnknownOptions` and never rejects a design (P9).
* **Canonical JSON and the hash.** Keys sorted by UTF-16 code unit, `-0` is `0`, numbers use the ECMAScript number-to-string algorithm, `undefined` members are dropped, non-finite numbers and non-plain objects throw. The SHA-256 is `@noble/hashes` (MIT), synchronous, so Node and the browser agree. `inputsHash` covers constraints, decision type, candidates, KB version, rules version, prompt version and roster, with order-insensitive lists sorted and de-duplicated, and a `hashFormat` version so a future change to the canonical form can never collide with old hashes. The hash is lowercase hex in core; the database adapter converts to `bytea`. A golden hash is locked in a test and was re-derived independently with Node crypto.
* **KB record schemas live in core** (conflict C-010), because rules and the `KBReader` port must type records and core imports nothing from `packages/kb`. `packages/kb` keeps release logic.
* **Money is never a float**: price amounts are decimal strings; the calculators (M5) convert to integer micro-units.

### Extensions to the specification (each logged in conflicts.md)

* **C-013** `Verdict` also carries `eliminated` (option, rule, record) and `scores` (per-dimension breakdown), because specification 6.4 and 6.5 say they are "stored with the verdict" but the 5.5 listing omits them.
* **C-014** `Finding` gets `kind: 'detected' | 'unknown'`, because the rule contract (7.1) requires "a finding of the kind unknown" and the 5.6 listing has no such field.
* **C-015** `Assumption` is a plain-language string (as in the specification's own example, C.4); `FlipCondition` gains `refersTo` so validator check G6 ("flip conditions reference existing fields") has something to check; a limit record's overage behaviour is the four overage values plus the two booleans `pauses_after_inactivity` and `scales_to_zero`, which together cover the six behaviours of 7.6 without making a single enum carry two independent facts.

### Consequences

* Good: invalid input fails loudly with a path; a malformed verdict cannot be stored; the hash cannot be affected by layout or ordering.
* Bad: the schema surface is larger than the specification's listing, and the three extensions need the founder's nod before the spec is revised (proposals are in `spec-change-proposals.md`).

### Confirmation

102 unit and property tests in `packages/core` (design invariants I1 to I8, verdict and reason rules, KB record schemas, config, canonical JSON, hash properties). Property tests: key order never changes a hash; moving or re-ordering never changes a design hash; any label, type, mode, choice, trait, edge or node change does.
