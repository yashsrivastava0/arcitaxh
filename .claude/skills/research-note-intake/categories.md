# Which folder

| Category (folder under `docs/02-research/`) | File here when the note is about |
|---|---|
| `market-and-competitors` | competitor products, positioning, audience, market evidence |
| `pricing-and-payments` | plan shape, price anchors, merchant-of-record options, unit economics |
| `legal-licensing-compliance` | licences, terms of data sources, privacy, residency, counsel questions (not legal advice) |
| `kb-sources` | vendor-fact research that may feed the KB; it is not the KB |
| `debate-and-evals` | debate evidence, judge bias, blind-test design, evaluation methods |
| `llm-providers-and-gateways` | providers, gateways, structured-output support, retention |
| `infrastructure-and-hosting` | hosting, database providers, streaming limits, queues (ADR-029 is Open) |
| `frontend-and-canvas` | canvas libraries, layout engines, UI kits, accessibility |
| `acquisition-and-growth` | launch channels, calculators as funnels, comparison pages, registries, recruitment |

Outside research: `03-specs` (specs, licence register), `04-decisions` (ADRs), `05-phases` (plans, status), `06-runbooks`, `07-validation`. Superseded notes go to `02-research/_archive/`.

If a note fits nothing, leave it in `00-inbox/` and say why; do not invent a category. Adding a category means changing `docs/_meta/categories.json` and the enum in `frontmatter.schema.json` together (and recording it in an ADR).
