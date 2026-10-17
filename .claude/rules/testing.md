---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "packages/**"
  - "tools/**"
  - "apps/**"
---

# Testing

- Tests first for the core: rule fixtures, golden designs and property tests are written with or before the code.
- Layers that block a release: unit (core), property (fast-check), golden (exact verdicts and numbers to the last digit), parity (Node vs browser, byte-identical JSON), KB checks, LLM tests with the fake client, integration on real PostgreSQL, API contract snapshots, docs check, licence and security, smoke test of the pages.
- Golden numbers from the spec's Appendix C are placeholders, not facts. Use them as starting cases only.
- Every rule has at least two fixtures: one that fires, one that does not.
- The adversarial grounding fixtures (invented price, invented product, number off by a unit, stale record cited, pick outside finalists, number hidden in a judgement) must all be rejected.
- The injection suite (hidden instructions, fake system messages, picks outside the finalist set, markup meant to leak) must keep the pick inside the set and log a security event.
- No test calls a real model, the network, or depends on the wall clock. Use the fake client and a fake `Clock`.
- Integration tests use real PostgreSQL, never a mock.
