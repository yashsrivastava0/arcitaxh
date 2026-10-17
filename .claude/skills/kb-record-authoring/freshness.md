# Freshness (specification 8.4)

States: **fresh** until `valid_until`; **due soon** in the last 7 days before it (Default); **expired** after it. An expired record is shown as expired with its last-verified date; it never eliminates an option and never produces a pick (P9).

TTLs, all Default and kept in `config/defaults/freshness.json`, never in code:

| Record kind | Valid for |
|---|---|
| price | 30 days |
| limit (free-tier limits) | 30 days |
| rate_limit (rate-limit tiers) | 30 days |
| capability | 90 days |
| latency_profile (first-party) | 14 days (the measurement job runs weekly) |
| guidance | 180 days |

Not given by the specification: option, tradeoff, flip, antipattern. Do not guess. Use whatever `config/defaults/freshness.json` says; if it has no entry for the type, that is an Open question for the founder (logged in `docs/05-phases/phase-0/plan.md`).

`valid_until` must equal `last_verified` plus the TTL for the type; `pnpm kb:check` fails otherwise. Release rules: the release fails on any expired record used by a launch decision type, any placeholder value in a launch record, and any quote not found in its snapshot; it lists records due within 7 days so they can be refreshed first. `pnpm kb:sweep` lists due and expired records and changes nothing.
