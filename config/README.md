# Config

Every value tagged **Default** lives here, not in code (hard rule 6), so Phase 0 can change it without a deploy. Each file carries `_status` and `_source` (the specification section). They are validated by Zod schemas in `packages/core/src/schemas/config.ts` at start-up.

| File | What |
|---|---|
| `defaults/scoring.json` | Dimension values, base weights, multipliers, theta thresholds |
| `defaults/finalists.json` | Finalist count |
| `defaults/rules.json` | Rule thresholds, design limits, month length, scale presets |
| `defaults/freshness.json` | Record TTLs by type; due-soon window |
| `defaults/debate.json` | Rounds, caps, timeouts, retries, roles |
| `defaults/cost.json` | Layer 2 paragraphs; arm length tolerance |
| `defaults/retention.json` | Retention periods |
| `phase0.json` | **Founder inputs**: waitlist price and period, spend cap (null until set), gate thresholds |
| `model-roster.json` | **Founder inputs**: provider, pinned model id and gateway per role (placeholders until set) |

Values the specification does not give are marked Assumption in `_status` and listed in `docs/05-phases/phase-0/plan.md`. Do not invent a price, a model id or a threshold the founder owns: leave `null` / `__FOUNDER_TO_SET__`.
