---
paths:
  - "packages/core/**"
---

# Core purity

`packages/core` is shared by the browser and the server and must be reproducible (P7).

- Forbidden in core source: `fs`, `path` I/O, `http`, `net`, `crypto`, `process`, `fetch`, `Date.now`, `new Date()`, `Math.random`, `performance.now`, `setTimeout`, environment access, database or provider SDK imports.
- Time comes from the `Clock` port and ids from the `IdGenerator` port, both passed in through inputs.
- Hashing is a synchronous pure-JS SHA-256 so Node and the browser agree without async WebCrypto.
- `core` never imports `kb`, `llm`, `db`, `api`, `worker`, `web` or `tools`.
- Missing or expired data never decides: an `unknown` finding or an `uncertain` verdict (P9).
- `position` of a component is excluded from every rule and every hash.
- Do not silence the lint rule that bans these globals. If a function seems to need I/O, it belongs behind a port.
