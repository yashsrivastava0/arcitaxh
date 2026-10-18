---
title: "ADR-037: Dependency boundary enforcement"
category: decisions
type: decision
status: draft
tags: [adr, phase-0, tooling, boundaries]
created: 2026-10-18
updated: 2026-10-18
verified_on: 2026-10-18
author: agent
sources: ["https://registry.npmjs.org/dependency-cruiser"]
supersedes: []
related: ["0032-repository-layout.md", "0035-lint-format-and-typescript-pin.md", "../01-source/architecture-specification-v0.1.pdf"]
confidence_tags: [Recommendation, Verified]
adr: "ADR-037"
adr_status: "Recommendation"
---

# ADR-037: Dependency boundary enforcement

Status: **Recommendation**. Specification 5.3 says the dependency-analysis tool is "to be chosen and its licence checked".

## Decision Outcome

**dependency-cruiser 18.6.0** (MIT, read from the installed package) is the primary net: `pnpm check:boundaries` runs `.dependency-cruiser.cjs` over `packages/`, `apps/` and `tools/` in CI. ESLint `no-restricted-imports` rules are the second net.

Rules enforced:

* `core` imports nothing from `kb`, `llm`, `db`, `tsconfig`, apps or tools; no Node built-ins; **third-party imports only `zod` and `@noble/hashes`** (an allow-list: anything else needs an ADR).
* `kb` may import `core`. `llm` may import `core` and `kb`. `db` may import `core`.
* `web` imports `core` only, and never Node built-ins, database drivers, server frameworks or provider SDKs.
* Apps do not import other apps. The AI SDK and provider SDKs are imported only in `packages/llm/src/adapters/`.
* `tools/` may import any package; nothing in `packages/` or `apps/` imports `tools/`. No circular dependencies.

### Consequences

* dependency-cruiser supports Node `^22 || ^24 || >=26` only. The machine's Node is 25.1.0, so scripts run on a pinned Node 24 runtime that pnpm downloads (ADR-033).
* `ports` for every repository and client interface are defined in `core` (types only), so `db` and `llm` implement core's interfaces and never import each other.

### Hardening after an independent review (M2)

A fresh reviewer (no sight of my conclusions) found no violation in production core and listed ways the *enforcement* could be bypassed. Each was closed and is covered by a regression test in `tools/policy`:

* The Node built-in list is read from `module.builtinModules` (so `fs/promises`, `path/posix`, `async_hooks`, `v8` and `module` are covered), and dynamic `import()` is banned in core.
* `globalThis`, `global`, `self`, `window`, `document`, `navigator`, `Intl`, `queueMicrotask`, `eval` and `new Function` are banned; aliasing, spreading or destructuring `Date` and `Math` is banned; `localeCompare` and `toLocale*` are banned.
* `@noble/hashes` is restricted to `sha2.js` and `utils.js`, and from `utils.js` only `bytesToHex` and `utf8ToBytes` (its `randomBytes` reaches WebCrypto).
* The core lint glob covers `.ts .tsx .mts .cts .js .mjs .cjs`, and a test asserts production core contains only `.ts` files.
* New dependency-cruiser rules: no test helpers imported from production core, no imports outside `packages/core`, noble entry points, and `not-to-unresolvable` for the whole repo. Writing the regression test exposed a further gap (third-party imports classified `npm-no-pkg` slipped past the allow-list), now closed.
* `tools/policy/src/boundaries.test.ts` builds a throwaway mini-repo with one deliberate violation per rule and asserts the real rule set fires on each.

### Confirmation

M1 acceptance: a deliberate boundary violation (core importing llm) fails `pnpm check:boundaries`, shown on a throwaway branch and then reverted (recorded in `status.md`).
