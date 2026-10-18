---
title: "Proposed changes to the specification"
category: phases
type: note
status: draft
tags: [phase-0, spec, changelog]
created: 2026-10-18
updated: 2026-10-18
verified_on: null
author: agent
sources: []
supersedes: []
related: ["conflicts.md", "../../01-source/architecture-specification-v0.1.pdf"]
confidence_tags: [Recommendation]
---

# Spec change proposals

The specification is not edited here or anywhere in the repo. Each proposed changelog entry (Appendix D format) is listed for the founder to apply in a single spec revision.

| Proposed version | Date | Change | Section | Author |
|---|---|---|---|---|
| 0.2 (proposal) | 2026-10-18 | Clarify that "p = 0.02" in the 150-judgment sanity check is the two-sided value; state whether the pre-registered test is one- or two-sided. | 17.2 | agent |
| 0.2 (proposal) | 2026-10-18 | Reconcile `kb/fixtures/` meaning (fake records, not golden designs). | 8.2 | agent |
| 0.2 (proposal) | 2026-10-18 | Extend `usage_events.purpose` and `LLMClient.purpose` for arm A. | 10.3, 10.4 | agent |
| 0.2 (proposal) | 2026-10-19 | Add `UsageInputs` to the constraints and the hash; state how usage grows and in which unit it is entered. | 5.2, 5.7, 7.3 | agent |
| 0.2 (proposal) | 2026-10-19 | State that expired data is unknown data for scoring, that weights renormalise over scored dimensions, and what "existing stack names the option's platform" means. | 6.4, 6.5 | agent |
| 0.2 (proposal) | 2026-10-19 | Give the TTLs for `option`, `tradeoff`, `flip` and `antipattern` records, and the values for operational simplicity and latency fit. | 6.5, 8.4 | agent |
| 0.2 (proposal) | 2026-10-19 | Add `eliminated` and `scores` to the `Verdict` type (6.4 and 6.5 say they are stored with it), and a `kind` (`detected` / `unknown`) to `Finding` (7.1 requires an "unknown" finding). | 5.5, 5.6 | agent |
| 0.2 (proposal) | 2026-10-19 | Model a limit's overage behaviour as four values plus two booleans (`pauses_after_inactivity`, `scales_to_zero`) instead of one six-value enum. | 7.6, 8.3 | agent |
