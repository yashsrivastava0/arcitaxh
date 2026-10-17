---
paths:
  - "kb/**"
  - "packages/kb/**"
  - "tools/kb-*/**"
---

# KB records

- Never write real prices, limits, capabilities or latency numbers from memory.
- You never write into `kb/records/`. Real facts arrive as `kb/proposals/` drafts (status `proposed`, `verified_by: null`) built from a vendor page you fetched, with the page text saved to `kb/snapshots/`. The founder promotes them.
- Fake records live in `kb/fixtures/` with vendor `vendor.example`. They are exempt from release checks and must never be bundled.
- A proposal's `quote` must appear verbatim in its snapshot, every number in it must appear in the quote, and the source URL must match the page fetched.
- Record envelope, TTLs and enums: `.claude/skills/kb-record-authoring/`.
- `kb/schema/*.json` is generated; never hand-edit it.
- A placeholder value (`<...>`, `__FOUNDER_TO_SET__`, `TODO`) in a launch record fails `pnpm kb:check`.
- Data sources that forbid redisplay (Artificial Analysis, OpenRouter catalogue, LMArena, VectorHub, free-for-dev, DB-Engines, ThoughtWorks Radar) are never records.
