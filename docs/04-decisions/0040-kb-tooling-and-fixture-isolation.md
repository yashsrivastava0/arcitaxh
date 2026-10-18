---
title: "ADR-040: KB tooling, proposals and fixture isolation"
category: decisions
type: decision
status: draft
tags: [adr, phase-0, kb, tooling]
created: 2026-10-19
updated: 2026-10-19
verified_on: null
author: agent
sources: []
supersedes: []
related: ["0016-knowledge-base-as-versioned-yaml-in-git-loaded-to-postgres.md", "0017-models-never-write-knowledge-base-records-a-person-approves.md", "0039-core-schemas-and-spec-extensions.md", "../05-phases/phase-0/conflicts.md", "../01-source/architecture-specification-v0.1.pdf"]
confidence_tags: [Recommendation, Assumption]
adr: "ADR-040"
adr_status: "Recommendation"
---

# ADR-040: KB tooling, proposals and fixture isolation

Status: **Recommendation**. Implements brief 10.6 (milestone M3).

## Context and Problem Statement

The KB is the product's moat and its largest risk: a wrong figure becomes a surprise bill. Phase 0 needs release checks, a bundle both the API and the in-browser calculator can read, a way for an agent to propose a real fact without ever writing one, and fake data for tests that can never reach a release.

## Decision Outcome

* **Layers.** `packages/core` holds the record schemas, the bundle schema and a pure bundle-backed `KBReader` (conflict C-010). `packages/kb` holds pure release logic: parsing a source tree, freshness, release checks, proposal verification, bundle building. The tools (`tools/kb-check`, `kb-build`, `kb-propose`) own all file and network access.
* **Release checks** (errors block; `kb:check` exits 1): schema; unique ids; right folder and section; no placeholder text (`<...>`, `__FOUNDER_TO_SET__`, TODO, TBD, FIXME) and no expired record for a launch decision type; every `source.quote` appears verbatim (whitespace-collapsed) in `kb/snapshots/<id>.txt`, and the snapshot is of the same URL; `valid_until` equals `last_verified` plus the type's TTL; every reference resolves (subject, deferral option). Records due within the review window are listed. `pnpm kb:sweep` lists due and expired records and changes nothing.
* **Missing TTLs are errors, not guesses.** The specification gives no TTL for `option`, `tradeoff`, `flip` and `antipattern` records (plan A10, question 9), so the config leaves them undefined and `kb:check` fails with a clear message for a record of such a type. No real record exists yet, so nothing fails today.
* **Proposals, not records.** `kb-propose` can snapshot a page and draft `kb/proposals/<id>.yaml` (`status: proposed`, all verification fields null). It writes the draft only if the quote is in the snapshot, every number in the body is in the quote, and the URL matches the snapshotted page. It has no path that writes `kb/records/`; the founder promotes by moving the file and setting the verification fields. The `kb-curator` subagent and `/propose-kb-record` use this tool.
* **Fetching is guarded** (SSRF): public https only, no credentials or explicit port, no localhost, private, link-local, reserved or numeric hosts, no IPv6 literals; redirects followed manually with each hop re-validated; 5 MB and 20 s limits; text only. DNS rebinding is not handled (accepted: the tool runs locally and only writes text).
* **Fixtures never ship.** Three layers: the tools read only five named folders, so `kb/fixtures` and `kb/schema` are never read in release mode; the loader refuses any path containing `fixtures/` unless explicitly told it is loading the fixture tree; `kb:build` refuses a root inside any `fixtures` folder; and in release mode a source host in the `*.example` family is an error (`fake-source`), so fixture data pasted into a real record is caught. The fixture KB (`kb/fixtures`, 4 options and 28 other records, every quote prefixed "FAKE FIXTURE") passes in fixture mode, and in release mode its only complaint is `fake-source`, which proves both its consistency and the guard.
* **Bundle.** `dist/kb/<version>.json`, deterministic (sorted by id), validated against the bundle schema, stamped with the git commit. A release version (`kb-YYYY.MM.N`) also requires a heading in `kb/CHANGELOG.md`; `--dev` builds the local, non-releasable `kb-dev`. Proposals are never included.
* **JSON Schemas** in `kb/schema/` are generated from the Zod schemas (`z.toJSONSchema`, no new dependency); CI fails if they are hand-edited or stale.
* **Only `vector-store` is authored** (structure only, no records) until question 1 is answered. Its `deferral_option` is `null` because that option is itself a record needing a verified source; a dangling deferral is a release error, so it cannot be set early by mistake. Verdicts for it are `kb_gap` until the founder promotes records.

### Consequences

* Good: a fluent wrong number cannot reach a release unnoticed; an agent can help curation without any power to publish a fact.
* Bad: curation stays manual (by design). `numbersInText` is deliberately strict, so a quote that writes "1M" rejects a proposal whose value is 1000000; a person handles those.

### Confirmation

`pnpm kb:check`, `pnpm kb:schema:check` in CI; 43 tests in `packages/kb` and 59 in `tools/kb-*` cover every failure mode on real files, the fixture guard, the SSRF guard, drafting and building.
