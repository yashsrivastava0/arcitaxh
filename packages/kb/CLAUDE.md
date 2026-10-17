# packages/kb

Purpose: knowledge-base schemas and validators (pure) plus the loader and bundle reader (ports). Turns `kb/` into a release bundle `dist/kb/<version>.json` and implements `KBReader` over it.

- May import: `core`. Not `llm`, `db`, apps. File access lives in the loader only; validators stay pure.
- Zod schemas for the record envelope and typed bodies are the source of truth. `kb/schema/*.json` is GENERATED (`pnpm kb:schema`); never hand-edit it.
- Fixture records in `kb/fixtures/` are exempt from release checks but must never be bundled. Test this.
- Freshness: fresh / due soon / expired, from `valid_until` and `config/defaults/freshness.json`. Expired records are shown as expired and never eliminate or produce a pick.
- Never write real prices, limits, capabilities or latency numbers from memory (see `kb/CLAUDE.md`).
- Test: `pnpm test --filter @product/kb`, then `pnpm kb:check` on the fixture KB.
