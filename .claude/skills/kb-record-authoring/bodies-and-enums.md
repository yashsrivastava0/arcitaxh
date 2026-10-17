# Typed bodies and enums

Body fields per record type (specification 8.3, summary). The Zod schemas in `packages/kb` define the exact shapes; where this file and the schema disagree, the schema wins and this file is stale.

| Type | Body fields (summary) | Used for |
|---|---|---|
| option | name, vendor, categories, deployment (managed / self-hosted / both), regions, licence (if open source), status (generally available / beta / deprecated), migration_effort, ops_burden, curated `why_pick` and `why_not` sentences | candidates, scoring, reasons |
| limit | scope, metric, value, unit, period, overage behaviour, pauses after inactivity, scales to zero | free-tier breakpoints, rules R-07 and E-4 |
| price | currency, unit (must match the calculator unit), amount, tier, billing period, what it includes | cost calculator |
| capability | capability id, support (yes / no / partial / unknown), notes | elimination E-1 |
| latency_profile | operation, region, p50, p95, basis, measured on, sample conditions | latency calculator |
| tradeoff | sentence, applicability conditions | verdict text |
| flip | typed condition, curated explanation | flip conditions |
| guidance | source document, licence, paraphrase in our own words, "grounded in" link | rules, blind spots |
| antipattern | rule id, plain-language description | rules R-01 to R-11 |

## Typed behaviours (specification 7.6): the `overage_behaviour` enum

| Value | Meaning | Calculator response |
|---|---|---|
| `hard_stop` | Requests fail once the limit is reached | Show the failure point as a reliability risk |
| `pauses_after_inactivity` | The resource pauses after a period with no activity | Show as an operational risk, separate from cost |
| `scale_to_zero` | The resource sleeps when idle and wakes slowly | Add a cold-start note to the latency estimate |
| `overage_billed` | Usage beyond the limit is charged at a listed price | Compute the bill after the limit, with a warning |
| `auto_upgrade` | The plan changes automatically | Show the new cost, with a warning |
| `throttled` | Requests are slowed beyond a rate | Show as a latency risk |

## Latency `basis`

`vendor_documented` | `first_party_measured` | `third_party_licensed` (only where the licence allows). Each profile carries region, `measured_on` and sample conditions. Never use Artificial Analysis numbers.

## Scoring inputs that come from records

`migration_effort` (low / medium / high; unknown scores 0.5 and flags uncertain) feeds `reversibility`; `ops_burden` feeds `operational_simplicity`. The allowed `ops_burden` values are defined by the Zod schema (Open: not fixed in the specification).
