---
title: "ADR-041: The decision pipeline and the interpretations it needed"
category: decisions
type: decision
status: draft
tags: [adr, phase-0, pipeline, engine]
created: 2026-10-19
updated: 2026-10-19
verified_on: null
author: agent
sources: []
supersedes: []
related: ["0012-rules-as-plain-functions-not-a-rule-engine-library.md", "0039-core-schemas-and-spec-extensions.md", "0040-kb-tooling-and-fixture-isolation.md", "../05-phases/phase-0/conflicts.md", "../01-source/architecture-specification-v0.1.pdf"]
confidence_tags: [Recommendation, Assumption]
adr: "ADR-041"
adr_status: "Recommendation"
---

# ADR-041: The decision pipeline and the interpretations it needed

Status: **Recommendation**, pending the founder. Implements brief 10.3 (milestone M4).

## Context and Problem Statement

Specification section 6 defines six stages but leaves several details open. Each place where I had to choose is listed here, so the founder can overturn it. None is a fact about any product; every numeric choice is a Default in `config/`.

## Decision Outcome

The pipeline is six pure functions plus a runner (`packages/core/src/pipeline/`): constraints, candidates, elimination, scoring, closeness, assembly. `runPipelineDetailed` also returns the inputs hash, the ranking, the margin and the finalists (the debate in M7 runs on those); `runPipeline` returns the outcome. Time comes only from the `Clock`. A verdict is validated against its schema before it leaves the pipeline.

* **Usage inputs.** E-4 (free-tiers-only) and the scale dimension need usage figures, which the spec's `ContextProfile` lacks but its section 7.3 lists as user inputs. A `UsageInputs` type was added and made part of `Constraints`, so it is part of the hash (conflict C-017). Usage is entered per limit metric in the limit record's own unit and period. Usage grows in proportion to traffic (requests per day preferred, users as the fallback); if growth cannot be known, "covers" is never claimed, but "exceeds today" is still conclusive.
* **Unknown vs empty.** `existingStack` and `mustHaves` are lists, so they can be empty but never "unknown", and they never block a verdict (conflict C-016). A required chip is missing only if it is `null` or `unknown`.
* **Expired data is unknown data.** An expired record never eliminates (P9) and is never used for a score either: its dimension becomes `unknown`, the option is flagged uncertain, and a plain-language assumption says so. The one exception is the specification's own rule: an expired price scores cost fit 0.5 with an uncertain flag.
* **Partial scores.** An `unknown` or `not_applicable` dimension is excluded and the remaining weights are renormalised to sum to 1, so an option is not penalised for a dimension nobody could check. The breakdown (value, effective weight, state, uncertain) is stored with the verdict.
* **Uncertain flag.** Any `unknown` dimension, any elimination-stage doubt (a missing or expired record, a "partial" or "unknown" capability), or an unknown migration effort makes an option uncertain. A verdict is `uncertain` if either top option is uncertain or the margin is below theta_uncertain. With almost no data, every verdict is therefore uncertain. That is intended, and it is what the "second opinion" offer is for.
* **Existing-stack multiplier.** "Existing stack names the option's platform" (spec 6.5) is read as: the user has a platform at all (a deploy target, or an existing-stack option whose KB record names a platform), which raises ecosystem fit's weight. Ecosystem fit itself is per option: in the stack 1.0, same platform 0.7, otherwise 0.4.
* **Compliance.** A `compliance` must-have `X` is checked as the capability `compliance.X` (E-1).
* **Cost fit** uses free-tier coverage and fixed monthly prices in USD only (the app never converts currency). Per-unit and per-token pricing belongs to the cost calculator (M5); until then a per-unit-only option has an unknown cost fit, never a guessed one.
* **Tie-break.** Equal scores rank by option id, and candidates and records are sorted by id, so a re-ordered but identical KB gives the identical verdict and hash (tested).
* **Assembly** uses curated sentences selected by matching conditions, each cited to its record. Computed flip conditions come from the free-tier breakpoint. The verdict is stale if any cited record has expired. Nothing is model-written.
* **Not used in Phase 0:** an option's `status` (`deprecated` is not a rule), the decision type's `design_rules` (M5), and blind spots (supplied by the design rules in M5 and carried through).

### Consequences

* Good: every guarantee is tested, including as properties: the pipeline never throws, is deterministic, and removing records, or letting time pass, can only remove eliminations; every elimination cites a record that is current on the verdict date. A deliberate mutation (treating expired records as current) was shown to fail these tests. The first version of the properties did not catch it, which is why the direct "every elimination cites a current record" property exists.
* Bad: the config tables for operational simplicity and latency fit are Assumptions (plan A11), and scale fit assumes consistent units between a user's figure and the limit record.

### Confirmation

`packages/core/src/pipeline/pipeline.test.ts` (37 golden tests with hand-computed scores) and `pipeline.property.test.ts` (9 property tests).
