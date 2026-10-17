# packages/core

Purpose: the pure TypeScript heart: types and Zod schemas, normalisation and hashing, the six-stage pipeline, rules, graph helpers, calculators, the grounding validator, security redaction. Browser and server import the same code.

- **No I/O, ever.** No `fs`, `http`, `process`, `Date.now`, `new Date()`, `Math.random`, `crypto`, `fetch`. Time comes from the `Clock` port, ids from `IdGenerator`. A lint rule enforces this; do not disable it.
- May import: nothing from `kb`, `llm`, `db`, `api`, `web`, `worker`, `tools`. Third-party: `zod`, a pure-JS SHA-256 only.
- `src/index.ts` is the public API. Everything else is private.
- Zod schemas in `src/schemas/` are the source of truth; infer types from them.
- Missing data returns an `unknown` finding or an `uncertain` verdict, never a pass or an elimination (P9).
- `position` stays on `Component` but is excluded from every rule and every hash.
- Defaults come from `config/defaults/*.json`, validated at start-up; never hard-code a Default.
- Test: `pnpm test:core`. Golden designs and fixtures live in `src/test/`; write them with or before the code. Property tests use fast-check.
- Gotcha: the same fixtures must produce byte-identical JSON in Node and in the browser build (parity test).
