---
title: "ADR-038: Licence gate, notices and secret scan"
category: decisions
type: decision
status: draft
tags: [adr, phase-0, licences, security]
created: 2026-10-18
updated: 2026-10-18
verified_on: 2026-10-18
author: agent
sources: []
supersedes: []
related: ["../03-specs/licence-register.md", "0033-package-manager-and-runtime-pins.md", "0036-test-runner-vitest.md"]
confidence_tags: [Recommendation]
adr: "ADR-038"
adr_status: "Recommendation"
---

# ADR-038: Licence gate, notices and secret scan

Status: **Recommendation**. Brief 8.2: a licence gate that fails CI, and a notices generator that avoids new dependencies.

## Decision Outcome

Three small in-repo tools with no third-party dependencies of their own (Node built-ins and `pnpm licenses list --json`):

* **`tools/licences` (`pnpm licences:check`)**
  * Hard-deny list, anywhere in the tree (production or dev): GPL, AGPL, LGPL, SSPL, BUSL, Elastic, FSL, UNLICENSED, unknown or missing, non-commercial. A dual licence is fine only if an allowed option satisfies it (`MIT OR GPL-3.0` passes; `MIT AND GPL-3.0` fails).
  * **Production** dependencies: strict allow-list (MIT, ISC, Apache-2.0, BSD-2-Clause, BSD-3-Clause, 0BSD, CC0-1.0), no exceptions.
  * **Dev-only** dependencies outside the allow-list (for example `lightningcss` MPL-2.0, `minimatch` BlueOak-1.0.0, both transitive via Vite) need a named row with a reason in the register's section 4.
  * Every direct dependency of every workspace needs a register row (section 2) whose licence equals what is installed.
* **`tools/notices` (`pnpm notices`, `pnpm notices:check`)** generates `THIRD_PARTY_NOTICES.md` from the production dependencies of `packages/*` and `apps/*` only (tools are never shipped), grouping identical licence texts. CI fails if the file is stale. It currently lists nothing: no shipped package has a dependency yet.
* **`tools/secret-scan` (`pnpm secrets:scan`)** scans git-tracked and untracked-unignored files for key-shaped strings (`sk-`, `AKIA`, `gh*_`, `xox*-`, Google keys, private-key blocks, quoted credential assignments) and prints file, line and pattern but never the value. Core's R-09 and `security/redact` (M6) will use the same families.

### Consequences

* Good: the register cannot silently go stale; the policy is executable and tested (Vitest).
* Bad: the register's licence column must be kept in step by hand when a dependency is upgraded and its licence string changes.

### Confirmation

Unit tests for each tool; CI stage 8. M1 acceptance: an added GPL package fails the gate, demonstrated with a throwaway local package on a throwaway branch and then reverted.
