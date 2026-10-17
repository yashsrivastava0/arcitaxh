# Frontmatter fields

Schema: `docs/_meta/frontmatter.schema.json` (authoritative). Required on every Markdown file outside `00-inbox/`, `01-source/`, `_archive/`, `_templates/`, `_meta/`; files named `README.md`, `INDEX.md`, `CLAUDE.md` are exempt.

| Field | Allowed values / rule |
|---|---|
| `title` | Non-empty, at most 200 characters |
| `category` | Must equal the folder's category (market-and-competitors, pricing-and-payments, legal-licensing-compliance, kb-sources, debate-and-evals, llm-providers-and-gateways, infrastructure-and-hosting, frontend-and-canvas, acquisition-and-growth; or specs, decisions, phases, runbooks, validation for the numbered folders) |
| `type` | research, spec, decision, runbook, plan, note, source |
| `status` | draft, reviewed, verified, superseded, archived |
| `tags` | Free list of strings (may be empty) |
| `created`, `updated` | `YYYY-MM-DD`, real calendar dates, `updated` not before `created` |
| `verified_on` | Date the facts were checked against their sources, or `null` |
| `author` | founder, agent, external |
| `sources` | List of URLs |
| `supersedes`, `related` | Relative paths; every target must exist |
| `confidence_tags` | Any of Verified, Decision, Recommendation, Assumption, Default, Open |
| `adr`, `adr_status` | ADR files only (for example `ADR-032`; Decision / Recommendation / Open / Assumption) |

No other keys are allowed; a typo fails the check.
