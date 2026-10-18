---
title: "Phase 0 conflicts between documents"
category: phases
type: note
status: draft
tags: [phase-0, conflicts]
created: 2026-10-18
updated: 2026-10-18
verified_on: null
author: agent
sources: []
supersedes: []
related: ["plan.md", "../../01-source/architecture-specification-v0.1.pdf"]
confidence_tags: [Recommendation]
---

# Conflicts and clarifications

Precedence: a blueprint Decision, then the specification, then the research report, with the build brief as the instruction for this phase. Nothing here is resolved silently. "Founder input needed" is yes only when scope, cost or licences are affected.

| ID | Where | What differs | Proposed resolution | Founder input needed |
|---|---|---|---|---|
| C-001 | Brief 2.3 rule 8, 4.1 tree, 8.3 stage 6 | Cross-references point to brief sections 10.4 / 10.5 for the KB content rule and release checks; they are in brief section 10.6 (and spec 8.4). | Follow section 10.6. | No |
| C-002 | Brief 12.2 vs spec 9.3 | `GET /v1/kb/decisiontypes` (brief) vs `/v1/kb/decision-types` (spec). | Use the spec's hyphenated path; it becomes the contract snapshot. | No |
| C-003 | Brief 12.1 vs spec 10.3 and 10.4 | `usage_events.purpose` and `LLMClient.purpose` allow `explain`, `debate_turn`, `judge`. Arm A (one strong model, no KB) is a model call with none of these purposes. | Add one value for arm A when M7 starts, record it in an ADR. The brief already allows extending "only if needed". | No |
| C-004 | Report (Phase 0 row) vs brief 8.1 | The report lists Langfuse Hobby, promptfoo and optionally Label Studio as Phase 0 reuse. The brief says skip them (usage goes to our own tables; the blind page is built in-house). | Brief wins for this phase. They stay in the licence register as Plan / Check. | No |
| C-005 | Spec 17.2 vs exact computation | The spec says 150 judgments at a 60% preference is "significant at about p = 0.02 by the normal approximation". Exact binomial: 90 of 150 gives one-sided p = 0.0088 and two-sided p = 0.0176. So "about 0.02" is the two-sided value. At 100 judgments, 60 of 100 gives one-sided 0.0284 and two-sided 0.0569, so it fails alpha = 0.025 either way; 61 of 100 is the smallest passing count one-sided. At 150, 88 of 150 (58.7%) already passes one-sided, so the 60% preference floor is the binding rule there. | Not a material numeric conflict. The pre-registration is drafted one-sided exact as the brief says, and the sidedness is flagged for the founder. Unit tests in M10 lock these numbers. | Yes, but only the one-sided vs two-sided choice before the lock |
| C-006 | Spec 8.2 vs brief 10.6 | Spec: `kb/fixtures/` holds golden designs for rule and calculator tests. Brief: `kb/fixtures/` holds FAKE KB records, never shipped. | Brief wins. Fake records live in `kb/fixtures/`; golden designs live in `packages/core/src/test/golden/`. | No |
| C-007 | Spec 16.2 vs brief 10.4 | Spec Phase 0 rules: R-01..R-07 and E-1..E-4. The brief adds R-09 and `security/redact` (because Phase 0 sends scenario text to models) and makes E-5, E-6, R-08, R-10, R-11 optional. | Brief wins. R-09 and redaction are implemented; optional items only if cheap. | No |
| C-008 | Spec 10.3 vs brief 12.1 | Spec `usage_events.user_id text NOT NULL REFERENCES "user"`; `debates.user_id` likewise. No `user` table exists in Phase 0. | Brief wins: both nullable, no FK, FK added later by an expand-and-contract migration. | No |
| C-009 | Spec 4.13 / Appendix A vs rule 1 | Spec lists library versions read from the registry on 17 Oct 2026 (for example React Flow 12.12.0, Router 8). | Versions come from the lockfile at install time. The spec's numbers are not used. | No |
| C-010 | Brief 4.3 rule 3 and 10.6 vs spec 5.3 | Brief: `web` imports `core` only, and `kb` holds the KB schemas and the `KBReader` over the bundle. But the public calculator (web) must read the KB bundle, and `core`'s rules and ports must type KB records, and `core` may not import `kb`. | Put the KB record envelope and body Zod schemas, the `KBReader` port and a pure bundle-backed reader in `packages/core` (all pure, no I/O). `packages/kb` keeps the release logic: freshness, TTLs, release checks, quote verification, loader and bundle builder, JSON Schema generation. Resolves the tension without breaking any rule. Applied in M2/M3. | No |
| C-011 | Brief 7.1 item 3 vs pnpm 12 | The brief lists `pnpm ci` as "runs everything CI runs". pnpm 12 has a built-in `ci` command that deletes `node_modules` and reinstalls with a frozen lockfile, and it takes precedence over a script with that name. | The script exists, invoked as `pnpm run ci`. CLAUDE.md, the slash commands and the permission lists say so, and bare `pnpm ci` needs confirmation. | No |
| C-012 | Brief 8.1 vs registry | Brief assumes the current TypeScript and a linter that supports it. TypeScript 7.0.2 is `latest`; typescript-eslint supports only below 6.1. | TypeScript pinned to 6.0.3 (ADR-035). Tooling only; no scope, cost or licence effect. | No, but see ADR-035 |
| C-013 | Spec 5.5 vs 6.4 and 6.5 | The `Verdict` type (5.5) omits the eliminations list (option, rule id, record id) and the per-dimension score breakdown that 6.4 and 6.5 say are "stored with the verdict". | Added as required arrays `eliminated` and `scores` (ADR-039). | No |
| C-014 | Spec 5.6 vs 7.1 | The `Finding` type (5.6) has no `kind`, but the rule contract (7.1) says a rule with missing data returns "a finding of the kind unknown". | Added `kind: 'detected' | 'unknown'` (ADR-039). | No |
| C-015 | Spec 7.6 vs 8.3 | Section 7.6 lists six typed behaviours as one enum; the 8.3 example has `overage_behaviour` plus a separate `pauses_after_inactivity` boolean, and the limit-body summary lists "pauses after inactivity, scales to zero" as separate fields. | A limit has `overage_behaviour` (hard_stop, overage_billed, auto_upgrade, throttled) plus booleans `pauses_after_inactivity` and `scales_to_zero`; the calculators treat the union as the six behaviours (ADR-039). | No |
| C-016 | Spec 5.2, 6.2 vs brief 10.3 | `ContextProfile.existingStack` and `mustHaves` are lists, so a skipped chip cannot be told apart from "none". Spec 6.2 says a vector-store verdict needs the existing stack. | An empty list is a valid answer and never blocks a verdict; only `null` / `unknown` chips are "missing" (ADR-041). A later interview could add an explicit "answered" marker. | No |
| C-017 | Spec 5.2 / 7.3 / 5.7 | Usage figures (7.3) are inputs to E-4 and the scale dimension, but they are not part of `ContextProfile`, and the hash (5.7) covers "normalised constraints" only. | `UsageInputs` is part of `Constraints`, so it is in the hash; a different usage figure is a different verdict. | No |

## Open

C-005 sidedness. The brief asks for a one-sided exact test as the draft and for the founder to decide. Decide before `pnpm phase0:lock`.
