# Plug In the Plumbing, Build the Judgment

Almost everything this product needs to *run* already exists under licenses that permit a paid, closed-source SaaS. The founder can plug that in and spend solo hours on what no library or dataset provides: the typed design model and its canvas interactions, the deterministic rules and calculators, a first-party knowledge base (KB) in which every price and limit has a source and a verified date, and the grounding, caching and metering around the multi-model debate. **The recommended stack is one TypeScript monorepo:** React with React Flow 12 (MIT), a Hono API that streams Server-Sent Events (SSE), a pg-boss worker and Postgres in an EU region. Model calls go through the Vercel AI SDK, behind the app's own provider interface, routed via OpenRouter or Vercel AI Gateway. Add Better Auth, PostHog EU and a merchant of record (MoR) for payments, all on long-running containers, because Vercel functions count streamed responses toward a 300 to 800 second cap. **The research sharpens the pitch.** Multi-model debate is now a commodity: free councils and MIT command-line tools exist, and recent papers find debate often fails to beat simpler baselines at equal compute. So debate stays an optional engine for close calls, and the Phase 0 blind test needs a third arm, the same engine without debate. **The defensible ground is a combination no competitor offers.** Decision receipts are conditional verdicts with flip conditions and sourced, dated facts. A budget-and-scale simulator covers AI apps specifically. Re-check alerts fire when a price, limit or deprecation changes a saved decision, which is the reason to keep paying monthly. **Price** an individual plan around $20 to $29 a month with included debates and a team plan around $40 to $60 per editor, and sell through an MoR. If the founder is India-based, that means Polar, Dodo or Paddle, because Stripe Managed Payments excludes India. **Acquire users** with a free no-login calculator, hand-built comparison pages fed by the KB, an MCP server, and ADR (architecture decision record) pull requests into GitHub. **Two blueprint gaps need attention now.** First, Artificial Analysis, OpenRouter's model catalog, LMArena and several popular comparison lists forbid or do not license redisplay, so latency numbers must be measured first-party. Second, Catio, a funded "Architecture IDE" with a Decide stage, is missing from the competitor list.

*Tags follow the blueprint. **Verified** means checked against the linked source on 2026-10-17 by the research notes; some fetches went through a summarizing tool, so re-check exact wording before quoting. **Decision** means the founder's settled choice, which this report does not reopen. **Recommendation** means this report's suggestion. **Assumption** means unconfirmed.*

## The verdict on one screen

| Question | Answer | Tag |
|---|---|---|
| What to plug in vs build | **Plug in:** canvas library, UI kit, LLM SDK and gateway, job queue, auth, payments, analytics, price catalogs (as change signals), ADR and diagram formats. **Build:** typed design model and canvas interactions (drawer, swap-and-rewire, ghost nodes, numbers strip, scale slider); rules and calculators; sourced KB and its human-approved update pipeline; debate protocol and judge validator; credit ledger; exporters; MCP server | Recommendation |
| Stack | TypeScript monorepo:<br>• React + @xyflow/react 12 + shadcn/Radix/Tailwind + Zustand<br>• Hono API with SSE, plus a pg-boss worker<br>• Postgres in an EU region<br>• AI SDK 7 behind your own `LLMClient`, routed via OpenRouter or Vercel AI Gateway<br>• Langfuse Cloud, Better Auth, Cloudflare R2 (EU), PostHog EU, Resend<br>• Containers on Railway (Amsterdam) or Render (Frankfurt) | Recommendation |
| Uniqueness angles | (1) Decision receipts, (2) AI-app budget and scale simulator, (3) re-check-my-stack alerts. Ship the MCP server but don't headline it; keep debate in the background | Recommendation |
| Debate | Multi-provider debate stays (Decision). Keep it optional for close calls and add an "engine without debate" arm to Phase 0 | Decision + Recommendation |
| Pricing | Free / Pro around $20–29 a month with a set number of debates / Team around $40–60 per editor. Debate packs of $20 or more; no lifetime deals | Recommendation (unvalidated) |
| Payments | MoR. **If India-based** (Assumption): Polar or Dodo first, Paddle as fallback. **If US/EU-based:** Stripe Managed Payments, Polar or Paddle | Recommendation (conditional) |
| Acquisition | No-login calculator as the Show HN artifact; hand-built comparison pages; reference-architecture gallery; MCP registry and Claude directory listings; ADR pull requests into GitHub; founder-led answers in communities. Paid channels only after conversion is measured | Recommendation |
| Validation | Waitlist with a price → refundable "founding member" pre-order → three-arm blind test, all before the canvas is built | Recommendation |

## Most plumbing plugs in; the judgment layer is yours to build

The inventory below sorts every layer into the three treatments the coordinator asked for. In each cell, the first term in parentheses is the license. The verdict after it says whether a closed-source commercial product may use the item:

- **yes:** allowed, with notice-only obligations (MIT, ISC, Apache);
- **paid:** allowed only with a purchased license;
- **conditions:** extra terms apply, and they are spelled out in the cell.

Items in the build column are first-party code, so no license question arises. The split mirrors the blueprint's priorities. Everything that touches trust (facts, elimination, citations, freshness) or the canvas experience is built. Commodity plumbing is plugged in, so solo time goes to the canvas (Decision: frontend and UX first).

| Area | Plug in as-is | Configure or adapt | Build from scratch |
|---|---|---|---|
| **Frontend canvas** | [@xyflow/react](https://registry.npmjs.org/@xyflow/react) 12.12.0 (MIT; yes)<br>[@dagrejs/dagre](https://registry.npmjs.org/@dagrejs/dagre) 3.1.1 for left-to-right auto-layout (MIT; yes)<br>shadcn/ui, [radix-ui](https://registry.npmjs.org/radix-ui), Tailwind 4, cmdk, sonner, motion, react-resizable-panels, tinykeys (MIT; yes)<br>[zustand](https://registry.npmjs.org/zustand) 5 (MIT; yes)<br>[lucide-react](https://registry.npmjs.org/lucide-react) icons (ISC; yes)<br>Vite + React Router 8 with prerendered marketing routes, or Next.js 16 (MIT; yes) | [React Flow UI](https://reactflow.dev/ui) shadcn components copied into the repo (MIT per site footer; yes)<br>[React Flow Pro](https://reactflow.dev/pro/examples) for one month, for its helper-lines, undo/redo, auto-layout and copy-paste examples (paid; conditions: no standalone redistribution; rights survive cancellation)<br>[mermaid](https://registry.npmjs.org/mermaid) 12.2.0 + [@statelyai/graph](https://registry.npmjs.org/@statelyai/graph) 2.6.0 for Mermaid import (MIT; yes)<br>AI Elements / streamdown streaming components, copied in (Apache-2.0; yes, keep NOTICE)<br>[elkjs](https://registry.npmjs.org/elkjs) later, in a Web Worker (EPL-2.0; conditions: keep unmodified, ship a license copy and a source pointer)<br>zundo for undo (MIT; yes), or your own command stack<br>Langflow and OpenFlowKit as code references (MIT; yes) | Typed design model and its React Flow adapter<br>Component type registry and palette<br>Typed nodes with badges and ghost states<br>Decision drawer<br>Swap-and-rewire as one undo step<br>Context chips, numbers strip, 1x/10x/100x slider, compare view, debate-theater layout<br>"Design it for me": LLM emits typed JSON → validation → dagre layout → render<br>Command-based undo, and autosave of durable fields only |
| **LLM and debate layer** | Vercel AI SDK [`ai`](https://www.npmjs.com/package/ai) 7, using `generateText`/`streamText` with `Output.object` and Zod (Apache-2.0; yes)<br>[OpenRouter](https://openrouter.ai/pricing) via `@openrouter/ai-sdk-provider` (hosted service; SDK Apache-2.0; yes), or [Vercel AI Gateway](https://vercel.com/docs/ai-gateway/pricing)<br>[Langfuse Cloud](https://langfuse.com/pricing) for traces (MIT outside `/ee`; yes) | Native structured-output modes per provider, with schemas kept flat to fit [Gemini's JSON Schema subset](https://ai.google.dev/gemini-api/docs/structured-output)<br>Provider prompt caching, with the static prefix first<br>[promptfoo](https://github.com/promptfoo/promptfoo) or Inspect for regression tests (MIT; yes)<br>[Label Studio](https://github.com/HumanSignal/label-studio), if you don't build your own blind-rating page (Apache-2.0; yes)<br>LiteLLM price JSON or models.dev as a versioned internal price snapshot (MIT; yes) | Your own `LLMClient` interface<br>Debate state machine: trigger, roster, round cap, early stop, timeouts, cancellation<br>Turn and verdict schemas<br>Judge rubric and grounding validator<br>Anti-conformity rules<br>Exact-hash verdict cache<br>Per-call usage rows<br>Phase 0 test harness |
| **Knowledge base and freshness** | [changedetection.io](https://raw.githubusercontent.com/dgtlmoon/changedetection.io/master/LICENSE), self-hosted (Apache-2.0; yes) or the [hosted plan](https://changedetection.io/)<br>[AWS Price List API and SNS price notifications](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/price-notification.html), [Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices), [GCP Pricing API](https://docs.cloud.google.com/billing/docs/how-to/get-pricing-information-api) (official sources; the GCP API is in Preview) | [LiteLLM price JSON](https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json), [genai-prices](https://raw.githubusercontent.com/pydantic/genai-prices/main/README.md) and [models.dev](https://raw.githubusercontent.com/sst/models.dev/master/LICENSE) as diff signals, not as truth (MIT; yes)<br>[VectorDBBench](https://raw.githubusercontent.com/zilliztech/VectorDBBench/main/README.md) code, run yourself (MIT; yes)<br>[Azure inter-region latency](https://learn.microsoft.com/en-us/azure/networking/azure-network-latency) table (cite it)<br>Guidance rewritten in your own words with a "grounded in" link:<br>• Google Cloud docs and Azure Architecture Center (CC BY 4.0)<br>• AWS docs, [OWASP LLM Top 10](https://raw.githubusercontent.com/OWASP/www-project-top-10-for-large-language-model-applications/main/LICENSE.md) and 12-factor agents (CC BY-SA 4.0) | KB-as-code records with `source_url`, `source_quote`, `last_verified`, `valid_until`, `verified_by`, `curator_note` and behaviour fields<br>CI check that fails on expired records<br>Daily upstream diff that opens a candidate PR<br>LLM proposes changes; a human approves<br>Expiry sweep<br>Options, trade-offs and flip conditions for about 15 decision types<br>Rate-limit tier tables<br>First-party latency harness |
| **Backend and SaaS plumbing** | [Hono](https://hono.dev/docs/helpers/streaming) 4 with `streamSSE`, and Zod (MIT; yes); Drizzle (Apache-2.0; yes)<br>[pg-boss](https://github.com/timgit/pg-boss) 12 or DBOS Transact (MIT; yes)<br>Postgres in an EU region<br>[Better Auth](https://github.com/better-auth/better-auth/blob/main/LICENSE.md) 1.7 with GitHub OAuth plus org, API-key and rate-limit plugins (MIT; yes)<br>[R2 with `eu` jurisdiction](https://developers.cloudflare.com/r2/reference/data-location/) for exports; Resend for email<br>Railway or Render containers | [graphology](https://graphology.github.io/standard-library/) or @dagrejs/graphlib for cycles, topological sort and connected components (MIT; yes)<br>Checkout and webhook patterns from [nextjs/saas-starter](https://github.com/nextjs/saas-starter) (MIT; yes)<br>[Trigger.dev Cloud](https://trigger.dev/docs/realtime/overview) as a managed alternative to hand-built SSE replay (Apache-2.0; yes; US sub-processor) | Rules engine as pure TypeScript functions: single point of failure via articulation points (Tarjan's algorithm), sync-chain latency, missing cache, free-tier budget<br>SSE endpoint with `Last-Event-ID` replay, keepalives, grace-period cancel and a stop endpoint<br>`debate_events` table + LISTEN/NOTIFY<br>`design_versions` as JSONB snapshots<br>`verdict_cache` table<br>Credit ledger and entitlements<br>GDPR deletion cascade<br>Secret redaction before LLM calls<br>BYOK key encryption (later) |
| **Payments** | MoR checkout: [Polar](https://polar.sh/docs/fees), [Dodo](https://dodopayments.com/pricing), [Paddle](https://www.paddle.com/pricing), or [Stripe Managed Payments](https://docs.stripe.com/payments/managed-payments/eligibility) (US/EU sellers only) (services; yes) | MoR meters and credits (Polar Meter Credits, Dodo credits), or allowances kept in your own ledger<br>[Better Auth payment plugins](https://www.better-auth.com/docs/plugins/stripe) (Stripe, Polar, Dodo and Creem listed) | Postgres credit ledger (reserve / settle / release) with idempotent webhook grants<br>Mapping of plans to entitlements<br>Terms, Refund and Privacy pages plus a visible price, which MoR domain review requires |
| **Analytics, errors, email** | [PostHog EU](https://posthog.com/pricing) (MIT outside `ee/`; yes)<br>[Sentry EU](https://docs.sentry.io/organization/data-storage-location/), optional (SDK MIT; use the hosted server, which is FSL-licensed)<br>Plausible Cloud or Umami (MIT) for the marketing site | PostHog in memory or cookieless mode until consent<br>`beforeSend` scrubbing of keys and free text | Event taxonomy: first verdict, first receipt export, alert opened |
| **Exports and distribution** | [MADR 4.0](https://raw.githubusercontent.com/adr/madr/main/LICENSE) template (MIT OR CC0; yes); Nygard ADR format (CC0)<br>Mermaid, the only diagram format [GitHub renders inline](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams)<br>Typst (Apache-2.0; yes) or headless Chromium for PDF<br>[Official MCP Registry](https://blog.modelcontextprotocol.io/posts/2025-09-08-mcp-registry-preview/), which feeds GitHub's MCP Registry<br>[Claude Connectors Directory](https://claude.com/docs/connectors/directory) | Structurizr DSL (Apache-2.0) and D2 (MPL-2.0), emitted as text by your own serializers<br>ADR folders compatible with Archgate and Log4brains (Apache-2.0) | Serializers for Mermaid, Structurizr and D2<br>Design-doc and ADR generator, with front matter for KB version, flip conditions and a canvas deep link<br>GitHub App that opens PRs, including "superseded by" PRs<br>Read-mostly remote MCP server |

**One notices file covers almost everything.** Nearly every plug-in carries notice-only obligations, so a single third-party notices file covers them. There are three exceptions:

- **ELK** (EPL-2.0) requires a license copy and a source pointer, and must stay unmodified ([EPL-2.0 summary](https://choosealicense.com/licenses/epl-2.0/)).
- **D2** (MPL-2.0) is file-level copyleft.
- **React Flow Pro** is paid.

**React Flow attribution: buy one month of Pro.** React Flow's MIT build renders a small attribution. Hiding it is technically possible, but the maintainers ask that only subscribers do so ([React Flow attribution](https://reactflow.dev/attribution)). A one-month Pro subscription is therefore the low-friction path for a product with a premium feel. Under the Pro license, downloaded examples stay usable after cancellation and commercial integration is allowed. The license does bar uses that "directly compete with xyflow's business model" ([React Flow Pro license](https://xyflow.com/pro-license)). That clause is undefined. It should not catch an architecture-advice SaaS, but a one-line email to xyflow to confirm is worth sending. **Recommendation.**

**Two design patterns keep the build small.** For "design it for me", the LLM emits typed JSON and a deterministic renderer lays it out and draws it, the pattern Archify uses ([Better Stack: Archify](https://betterstack.com/community/guides/ai/archify-architecture/)), so the model never chooses coordinates. For the debate, use a short deterministic runner over the AI SDK instead of LangGraph, Mastra or CrewAI. The debate has no tools and a fixed turn order, and the job queue already provides durability, so a framework adds nothing and is harder to test and audit. **Recommendation.**

### Licences and terms that rule items out

Several popular choices fail a closed-source paid product or need care. They are listed here so the founder does not rediscover the problem mid-build.

| Item | License or terms (Verified) | Closed-source commercial use | Use instead (Recommendation) |
|---|---|---|---|
| tldraw SDK | [Production use needs a license key](https://tldraw.dev/community/license); commercial price is set by sales and not published | Paid only | React Flow |
| GoJS, JointJS+ | Per-developer commercial licenses ([GoJS](https://gojs.net/latest/pricing.html), [JointJS](https://www.jointjs.com/pricing)) | Paid only | React Flow |
| Dify source | [Modified Apache-2.0](https://github.com/langgenius/dify/blob/main/LICENSE) that bans operating a multi-tenant environment without written permission | No | UX reference only |
| n8n, ComfyUI frontend, DeepDiagram | [Sustainable Use License](https://github.com/n8n-io/n8n/blob/master/LICENSE.md); [GPL-3.0](https://github.com/Comfy-Org/ComfyUI_frontend); [AGPL-3.0](https://dev.to/twwch/show-hn-deepdiagram-open-source-ai-diagram-generator-drawio-mermaid-3cil) | No | Langflow (MIT) as a reference |
| Ghost AI, Karpathy's llm-council | [No license stated](https://github.com/karpathy/llm-council), so all rights are reserved | No | Reimplement the ideas, not the code |
| LiteLLM `enterprise/`, Mastra `ee/`, Langfuse `/ee` | Enterprise licenses ([LiteLLM](https://github.com/BerriAI/litellm/blob/main/enterprise/LICENSE.md), [Mastra](https://github.com/mastra-ai/mastra), [Langfuse](https://langfuse.com/handbook/chapters/open-source.md)) | Paid only | Their MIT/Apache parts |
| Arize Phoenix | [Elastic License 2.0](https://github.com/Arize-ai/phoenix/blob/main/LICENSE) | Internal use yes; offering it as a hosted service no | Langfuse or Opik |
| Artificial Analysis data | Data Platform Terms v1.1 (see below) | No, unless an order form is signed | Measure your own numbers; link out |
| OpenRouter model-catalog data | [Terms §7 and §12](https://openrouter.ai/terms): no scraping or copying, no competing service, no use of "Materials" unless expressly authorized | No redisplay | Use only the `usage.cost` from your own calls, internally |
| LMArena leaderboard | [Personal or internal business use only](https://help.arena.ai/articles/5629909088-terms-of-use) | No | Link out |
| Superlinked VectorHub data | [CC BY-NC-SA 4.0](https://raw.githubusercontent.com/superlinked/VectorHub/main/LICENSE.md) | No | Copy only its schema idea |
| free-for-dev list; DB-Engines; ThoughtWorks Radar content; CloudPing | [No license file](https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md) or no reuse terms found | Treat as no | Vendor pages; link out |
| Build Your Own Radar; Lago; Flexprice; Unleash; Midday | [AGPL-3.0](https://raw.githubusercontent.com/thoughtworks/build-your-own-radar/master/LICENSE.md) | Don't embed or copy | Build natively; your own ledger; PostHog flags |
| adr-tools, PlantUML, Pandoc | GPL ([adr-tools](https://raw.githubusercontent.com/npryce/adr-tools/master/LICENSE.txt), dormant since 2020) | Don't bundle; running them as a server-side process is lower risk | MADR + Typst or Chromium |
| joelparkerhenderson ADR templates | [CC BY-NC-SA](https://raw.githubusercontent.com/joelparkerhenderson/architecture-decision-record/main/LICENSE.md) | No | MADR |
| Infracost pricing API | [Self-hosting moved to the enterprise tier](https://community-chat.infracost.io/t/22703729/u02fc3ybe5v-u01g5t3c76w-where-did-the-cloud-pricing-api-repo); terms for embedding are unverified | Unverified | Official AWS/Azure/GCP price APIs |
| Vendor logos (AWS/Azure, simple-icons) | [Azure permits diagram use only](https://learn.microsoft.com/en-us/azure/architecture/icons/); [simple-icons](https://github.com/simple-icons/simple-icons/blob/develop/DISCLAIMER.md) waives copyright, but trademarks remain with the brands | Unclear for bundling in a paid palette | Lucide glyphs by default; legal review |

### Artificial Analysis data is off-limits without a signed order form

The notes disagree on Artificial Analysis. The stricter reading governs.

**The attribution-based reading.** The competitor notes read the free API as attribution-based. That matches the API documentation, which says "Attribution is required for all use of our free API" and sets a 1,000 requests-per-day limit ([Artificial Analysis documentation](https://artificialanalysis.ai/documentation)).

**The stricter terms.** The knowledge-base notes cite the **Data Platform Terms v1.1, revised 19 August 2026** ([AA Data Platform Terms](https://artificialanalysiscdn.com/legal/ProDataPlatformTerms.pdf)):

- §4.1: commercial use "requires the execution of an Order Form".
- §2.4(c): you may not "Embed or otherwise make raw Data available through any customer-facing product, API, dashboard, or service".
- §2.4(a) and §2.5(a): redistribution and competitive products are barred.

The site Terms of Use go further and limit use to "personal, noncommercial use" ([AA Terms of Use](https://artificialanalysis.ai/docs/legal/Terms-of-Use.pdf)). Even the two API pages disagree on the free quota: 1,000 per day versus 100 per window ([AA API reference](https://artificialanalysis.ai/api-reference/beta)).

**Resolution (Recommendation).** The Data Platform Terms are more specific and more recent, and they address commercial use directly. Treat them as governing unless Artificial Analysis grants a written license. A paid product's internal calibration is itself commercial use, so:

- do not display Artificial Analysis numbers;
- do not seed the KB with them;
- do not use them to set defaults.

Link out to Artificial Analysis for live latency, and email them about commercial terms. Meanwhile, measure time to first token (TTFT) and throughput with a weekly first-party harness, and label each number with region, prompt size and date. Artificial Analysis's own methodology shows why the labels matter: it reports **medians over 72 hours from a single GCP us-central1 server**, and notes that TTFT depends on location ([AA methodology](https://artificialanalysis.ai/methodology/performance-benchmarking)).

### The knowledge base is the moat, and nothing ready-made fills it

No open, commercially reusable dataset of tech-stack trade-off text exists (Verified, as a negative search result). Option lists, "why not" text, flip conditions, free-tier behaviours and rate-limit tiers must all be written and maintained first-party.

**Use the MIT price catalogs as change signals, not truth.**

- **LiteLLM's JSON** had **4,201 entries**, a `source` field on 2,881 of them, and commits on each of the last 31 days ([LiteLLM file history](https://github.com/BerriAI/litellm/commits/main/model_prices_and_context_window.json)).
- **genai-prices** stores a `prices_checked` date and re-checks prices older than 30 days ([genai-prices](https://raw.githubusercontent.com/pydantic/genai-prices/main/prices/README.md)).
- **models.dev** has the broadest capability flags. But much of its churn comes from bots syncing aggregator catalogs, including OpenRouter's ([models.dev sync](https://github.com/sst/models.dev/blob/dev/sync.md)). Treat its values as pointers, and put the provider's own page in `source_url`.

**Store behaviour, not just numbers.** How a free tier behaves matters as much as its limits:

- Supabase pauses free projects after a week of inactivity ([Supabase pricing](https://supabase.com/pricing)).
- Neon's scale-to-zero "cannot be turned off" ([Neon pricing](https://neon.com/pricing)).
- Upstash's own pricing page contradicts itself on database count ([Upstash](https://upstash.com/pricing/redis)).

Typed fields such as `pauses_after_inactivity`, `scale_to_zero` and `overage_behavior`, plus a `curator_note` recording which conflicting number was chosen, let these behaviours drive both the surprise-bill warnings and the latency math. **Recommendation.**

**The update pipeline is mostly reused parts.** In order:

1. Daily git diffs of the price catalogs.
2. changedetection.io watches, each scoped to a vendor's pricing table.
3. The AWS daily price-change SNS topic.
4. An LLM step that only *proposes* a JSON change. Its quote is checked verbatim against the new page.
5. A human merge that sets `last_verified` and `valid_until`.

This preserves the blueprint's rule that models never supply prices. **Recommendation.**

**Proposed staleness TTLs** (the blueprint leaves this open):

- 30 days for token prices, free-tier limits and rate-limit tiers, following the genai-prices convention;
- 90 days for capability flags;
- 180 days for guidance links.

**Recommendation.**

## One repo, one database, two processes: the recommended system

The blueprint's shape survives intact: one modular app, a deterministic core, model providers at the edge. The research adds concrete parts and three constraints that are easy to miss.

**1. Serverless platforms cap streamed responses.** Vercel's function duration "includes streamed responses", with a cap of **300 seconds on Hobby and 800 on Pro** ([Vercel limits](https://vercel.com/docs/functions/limitations)). Hobby is also "non-commercial, personal use only" ([Vercel Hobby](https://vercel.com/docs/plans/hobby)).

**2. Hosts and poolers break long streams.** Railway closes HTTP requests "after 5 minutes with no data transferred" and caps them at 15 minutes ([Railway limits](https://docs.railway.com/networking/public-networking/specs-and-limits)), so keepalives and `Last-Event-ID` resume are mandatory. Neon's pooled connections do not support LISTEN/NOTIFY, so the SSE listener needs a direct connection ([Neon pooling](https://neon.com/docs/connect/connection-pooling)).

**3. A client disconnect does not stop the model call.** The AI SDK treats a browser abort as a disconnect, so "the model request, background job, workflow, or stream writer can continue running" ([AI SDK resume streams](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-resume-streams)). Two pieces fix this: an explicit stop endpoint, and a grace timer that cancels a debate only if no client reconnects. Together they honour the blueprint's "cancel the upstream call" rule without killing debates on a tab refresh. **Recommendation.**

```
Browser: React + React Flow + shared Zod types
  - Layer 1 rules run locally for instant badges
  - canvas, drawer, numbers strip, slider, debate theater
     |  HTTPS + session cookie                    ^ SSE: turn.started/delta/completed,
     v                                            |      cost.updated, verdict.ready, keepalive
+---------------- API process (Hono on Node, EU region, long-running container) ----------------+
| /auth/*            Better Auth: GitHub OAuth, orgs, rate limits, API keys                      |
| /designs           working-graph autosave + immutable design_versions (JSONB snapshots)       |
| /analyze           Layer 1: rules + latency/cost calculators (same TS module as the browser)  |
| /explain           Layer 2: small-model explanation via LLMClient (short, synchronous)        |
| POST /debates      plan check -> reserve credits (one tx) -> verdict_cache lookup             |
|                    -> pg-boss.send('debate') -> 202 {debateId}                                |
| GET /debates/:id/stream  LISTEN on direct PG connection; replay rows > Last-Event-ID;         |
|                    keepalive ~15s; on close start grace timer -> cancel if no reconnect        |
| POST /debates/:id/stop   pg-boss cancel -> AbortSignal into provider call                     |
| /mcp               read-mostly MCP server (OAuth): get_decisions, get_component_verdict,      |
|                    check_change_against_decisions                                             |
| /webhooks/mor      MoR payment -> credit_ledger grant (idempotent on event id)                |
| /webhooks/github   GitHub App installs; ADR PR status                                         |
+------------------------------------------------------------------------------------------------+
        | reads/writes                                         ^ NOTIFY debate_<id>, '<seq>'
        v                                                      |
  PostgreSQL (EU region)  <-------------------------  Worker process (same repo, same image)
   users, sessions, orgs                               - debate runner: advocates per finalist,
   designs, design_versions                              skeptic, cost/ops, security, judge
   decisions (+ cited kb_record_ids, kb_version)        (LLMClient -> OpenRouter / Vercel AI Gateway)
   debates, debate_turns, debate_events                - per call: usage_events + debate_events
   kb_records (versioned), verdict_cache               - judge output -> grounding validator
   usage_events, credit_ledger, alerts, pg-boss        - finish/cancel: settle + release credits
        |                                              - cron: KB diff import, expiry sweep,
  Cloudflare R2 (eu jurisdiction): exports               re-check alerts, export/PR jobs
  KB git repo (YAML records) -> CI schema + expiry checks -> tag = KB version -> load to kb_records
  External: LLM providers (via gateway), Langfuse Cloud, MoR, PostHog EU, Resend,
            changedetection.io webhooks, AWS price SNS
```

**The blueprint's three cost layers map onto endpoints.** Layer 1 runs in both browser and server from one TypeScript module. Layer 2 is a short synchronous call from the API. Layer 3, the debate, always runs in the worker.

**Debate progress streams through Postgres, not Redis.** Each debate is a pg-boss job. Its progress goes to an append-only `debate_events` table, and NOTIFY carries only the sequence number. That is required: Postgres NOTIFY payloads must stay **under 8,000 bytes**, and notifications are not stored for sessions that aren't listening ([PostgreSQL NOTIFY](https://www.postgresql.org/docs/current/sql-notify.html)). The result is reconnect-and-resume without Redis. For stopping, pg-boss passes the worker an `AbortSignal` that fires when a heartbeat finds the job cancelled, and that signal goes straight into the provider's fetch call ([pg-boss workers](https://github.com/timgit/pg-boss/blob/master/docs/api/workers.md)). **Recommendation.**

**Four additions to the data model (blueprint §11) make receipts, alerts and metering work.** **Recommendation.**

- **`Decision.kb_record_ids`** stores the facts a verdict cites. This is what lets a receipt show sources, and what lets an alert find the decisions a KB change affects.
- **`debate_events`** supports streaming replay.
- **`credit_ledger`**, with reserve, settle and release rows, enforces balances in real time. Stripe's basic credits cannot: they "reconcile at invoice time", and customers "can exceed their balance during the cycle" ([Stripe credits model](https://docs.stripe.com/billing/subscriptions/usage-based/use-cases/credits-based-pricing-model)).
- **`alerts`** records what changed and for whom.

**Cache verdicts by exact hash, with a longer key.** Extend the blueprint's cache key with the rules version, prompt and role-set version, and model roster. Keep it an exact hash rather than a semantic cache. Two constraint sets can embed almost identically yet need opposite verdicts (HIPAA required versus not). And the main open-source semantic cache, GPTCache, no longer adds support for new models ([GPTCache](https://github.com/zilliztech/GPTCache)). **Recommendation.**

**Rules stay plain functions.** Each rule has the form `(graph, ctx, kb) => Finding[]`, which makes fixture-based unit tests trivial. Rule-engine libraries model flat facts, but this product asks graph questions: cut vertices for single points of failure, longest synchronous paths for latency, cycles. graphology or @dagrejs/graphlib cover topological sort, cycles and components. Neither lists articulation points, so the single-point-of-failure check is a short hand-written Tarjan routine ([graphology](https://graphology.github.io/standard-library/), [graphlib](https://github.com/dagrejs/graphlib/wiki/API-Reference)). **Recommendation.**

**Security starts with giving debate models no tools.** No debate model gets a tool that writes, sends or fetches, so a prompt injection can at worst bend a verdict, and the grounding validator then checks that verdict against KB facts passed separately. The remaining safeguards:

- Wrap user text in delimited data blocks.
- Validate every output against a schema, as OWASP advises ("define and validate output formats with deterministic code") ([OWASP LLM01](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)).
- Redact obvious secrets such as `sk-`, `AKIA` and `ghp_` before any LLM call.
- Cap concurrent debates per user.

**Recommendation.**

**Privacy is the weak point for EU sales.** The database, files and backups can all live in an EU region, but model inference cannot easily follow:

- The Claude API's `inference_geo` accepts only "global" or "us" ([Claude data residency](https://platform.claude.com/docs/en/manage-claude/data-residency)).
- OpenAI's EU endpoint requires approval for Modified Abuse Monitoring or zero data retention ([OpenAI your data](https://developers.openai.com/api/docs/guides/your-data)).

So the privacy policy and sub-processor list must name each LLM provider, its region and its retention. **Verified + Recommendation.**

**Two alternatives remain valid if priorities differ.**

- **Managed path:** Next.js on Vercel Pro, Neon Frankfurt, and Trigger.dev Cloud with its built-in Realtime hooks and `runs.cancel`. It means writing less SSE code, but Trigger.dev documents no EU region ([Trigger.dev self-hosting](https://trigger.dev/docs/self-hosting/overview)).
- **Python path:** FastAPI, which has had native SSE with 15-second keepalive pings since 0.135.0 ([FastAPI SSE](https://fastapi.tiangolo.com/tutorial/server-sent-events/)), plus DBOS. It costs two languages and duplicated graph types.

The TypeScript default wins on one point neither can match: the same rules module runs in the browser for instant badges and on the server for persisted verdicts. **Recommendation.**

**Infrastructure is cheap before LLM spend.** On Render, the notes estimate **$20 to $60 a month**: a $7 API instance, a $7 worker, and Postgres from $6 ([Render pricing](https://render.com/pricing)). This is an estimate from list prices; check it with each provider's calculator.

## Use cases first: three receipts nobody else issues

The product stays simple if each visible surface answers one concrete question an AI engineer actually asks. There are three surfaces: the drawer, the numbers strip with its slider, and an alert.

### Use case 1: "Which vector store for my RAG app, given my context?"

An engineer with about 500 users, a free-tier budget and an existing Postgres drops a vector-store node. The drawer returns a **decision receipt**:

- the pick, often the boring one, such as pgvector in the existing database;
- why it won;
- the assumptions;
- the flip condition ("switch when corpus or query rate passes X");
- the runner-up;
- every price or limit, with its source link and verified-on date.

**Developers distrust AI answers they cannot check.** Stack Overflow's 2025 survey found **45.7% distrust AI accuracy against 32.7% who trust it, and 66% cite answers that are "almost right, but not quite"** ([Stack Overflow 2025](https://survey.stackoverflow.co/2025/ai)). In 2026, 48% said they trust AI "when they can easily validate its answers" ([Stack Overflow 2026](https://survey.stackoverflow.co/2026/ai)). In 2,430 Claude Code app-building runs, rephrasing the same requirement produced the same stack pick only **about 76% of the time** ([Amplifying](https://amplifying.ai/research/how-ai-coding-agents-choose-your-stack)).

**RAG questions are hard and context-dependent.** They are the hardest category on Stack Overflow, with **88.4% lacking an accepted answer** ([arXiv 2510.25423](https://arxiv.org/html/2510.25423v1)). Practitioners keep answering "it depends" on scale, update frequency and an existing Postgres ([HN thread](https://hn.algolia.com/api/v1/items/46000077)). That is exactly the situation a reproducible, cited, conditional answer serves.

**An honest "you may not need a vector DB yet" verdict is itself a differentiator.** It matches editorial advice to "add complexity only when the data says you need it" ([Respan](https://www.respan.ai/resources/choose-the-right-stack)). **Recommendation.**

### Use case 2: "What breaks first, and what will I pay at 10x?"

The numbers strip and the today/10x/100x slider become a **budget-and-scale simulator** for AI apps. It shows which component hits its free-tier or rate limit first, what the bill is after that, and the latency of the critical path. Cost already constrains this audience: **40% of AI engineers say it regularly shapes how ambitiously they use AI** ([Amplify 2026](https://ai.engineer/talks/the-2026-state-of-ai-engineering-barr-yaron-amplify-partners)).

Existing tools cover pieces, not the combination. beforeyouship.dev models LLM cost at 3x and 10x, but not latency or free-tier limits ([beforeyouship](https://beforeyouship.dev/)). Architecto and Brainboard estimate cloud infrastructure cost, not tokens ([Architecto](https://architecto.dev/)).

### Use case 3: "Tell me when my stack's assumptions change."

A saved decision knows which facts it rests on. When the KB pipeline merges a price change, a new limit or a deprecation that touches those facts, the app:

- re-runs the free Layer 1 rules;
- badges the decision;
- emails the user;
- can open a "superseded by" pull request against the ADR in their repo.

**The churn is real.** A public deprecation calendar lists **53 dated lifecycle entries** from July 2026 to May 2028, including Vertex's gemini-2.5 models retiring on **2026-10-20** ([deprecation calendar](https://hidekazu-konishi.com/entry/ai_model_deprecation_and_lifecycle_calendar.html)). Providers change prices "often without an email" ([PageCrawl](https://pagecrawl.io/blog/ai-provider-pricing-change-monitoring-openai-anthropic-google)).

**No competitor re-checks saved decisions.** None of those found re-evaluates a user's saved decision when an input changes. AgentDeals publishes a generic change feed and a one-time Stack Health Check ([AgentDeals](https://agentdeals.dev/)). This is the retention engine: the reason to pay in month six, after the design is done. **Recommendation.**

### MCP and ADR exports deliver the receipts but are not the pitch

Catio, Eraser, IcePanel and Hopsule already push decisions or architecture into coding agents. IcePanel's paid MCP server reads and writes ADRs ([IcePanel MCP](https://docs.icepanel.io/integrations/mcp-server)). Hopsule sells agent-facing decision memory at $19 and $49 a month ([Hopsule pricing](https://hopsule.com/pricing)). MCP is still worth shipping: it makes the user's coding agent cite their decisions while coding. Read-only access is also nearly free to serve, because reads hit stored verdicts.

### Where the competitive line falls

- **Catio** is closest in concept: an "Architecture IDE" whose loop includes "Decide" ("Evaluates options against explicit trade-offs and gives recommendations") ([Catio](https://www.catio.tech/)). But it sells to enterprise stacks through sales-assisted pilots ([Eniac job post](https://jobs.eniac.vc/companies/catio/jobs/77301322-founding-fda-forward-deployed-architect)), not to greenfield AI-app builders.
- **Jeda.ai** explicitly leaves the call to the user: "AI generates the structure; your team validates and decides" ([Jeda.ai](https://jeda.ai/ai-for-systems-architecture)).
- **Eraser** is the most dangerous adjacent player. It has clarifying questions, repo grounding, an MCP server and ADR outlines. Yet its own generator page sends users to an external LLM to "stress test" designs ([Eraser generator](https://www.eraser.io/ai/system-architecture-diagram-generator)).
- **The real free substitute** is Claude Code plus the MIT better-plan-mode skill ([better-plan-mode](https://github.com/jnemargut/better-plan-mode)) plus pricing MCP servers. The product beats that on trust (sources, consistency, freshness) and UX, not raw capability.

**Debate itself is commoditized.** Perplexity's Model Council, Opper's free Roundtable and Councly's $0.06 to $0.17 "hearings" all sell multi-model deliberation ([Opper](https://opper.ai/ai-roundtable), [Councly](https://glama.ai/mcp/servers/@slmnsrf/councly-mcp/tree/164e4dcc054da8b2e2b68ddb2541bed20abf3169)). So debate belongs inside the drawer as "get a second opinion on this close call", not on the homepage.

**A positioning line**, refining the blueprint's working pitch: "Every box on your AI architecture is a decision, and every decision gets a receipt: why it won, what would flip it, what it costs at 10x, and an alert when that changes." **Recommendation.**

## Phase 0 must test three arms, not two

The blueprint's gate stays: build the engine on a plain page, and build the canvas only if verdicts clearly beat a single model (blueprint §14). The research changes what Phase 0 must measure.

**The evidence on debate is mixed.**

- **Often no better than simpler baselines.** "If Multi-Agent Debate is the Answer, What is the Question?" found that debate "often fail[s] to outperform simple single-agent baselines" such as self-consistency, though mixing different models consistently helps ([Zhang et al. 2025](https://arxiv.org/abs/2502.08788v2)).
- **Most gains may come from voting.** A NeurIPS 2025 paper attributes most debate gains to majority voting ([Choi et al.](https://arxiv.org/abs/2508.17536v1)).
- **More rounds can hurt.** Accuracy can **decline over rounds** as correct agents flip under conformity pressure ([Wynn et al.](https://arxiv.org/abs/2509.05396v2)).
- **Assigned advocates do help.** With advocates arguing before a separate judge, non-expert judges reached 76% accuracy against a 48% baseline ([Khan et al.](https://arxiv.org/abs/2402.06782)).
- **Nothing tests architecture decisions directly.** No study tests debate on architecture or technology selection. The closest evidence is a 2026 conference talk reporting diminishing returns after 3 to 4 rounds ([WeAreDevelopers](https://www.wearedevelopers.com/videos/1952-mad-about-software-design-when-ai-architects-argue)).

**So Phase 0 needs three arms:**

1. One well-prompted strong LLM.
2. The engine without debate: KB candidates, rule elimination, scoring, and one strong model's explanation.
3. The engine with debate.

A cheap fourth arm is optional: sample the judge model three times and take the majority vote. Without arm 2, a win cannot be credited to debate rather than to the deterministic pipeline and KB. **Recommendation.**

**Blinding must account for known judge biases.** Model judges show position, verbosity and self-preference biases ([Zheng et al.](https://arxiv.org/abs/2306.05685), [Panickssery et al.](https://arxiv.org/abs/2404.13076)), and verbosity bias affects human raters too. So:

- render every arm in one neutral template (pick, why, assumptions, flip conditions, runner-up);
- randomize sides per item and per rater;
- hide model names;
- ask for a forced choice ("which would you act on?") with a free-text reason and a "both wrong" option;
- pre-register the decision rule.

**Get enough judgments.** Fifteen to twenty raters giving one judgment each is underpowered. Have each engineer rate 6 to 10 scenarios from their own domain. That yields roughly 100 to 200 paired judgments, enough for a sign test or a Bradley-Terry model. These are planning inferences, not a sourced power calculation. **Recommendation.**

| Phase | Reuse | Build | Exit criteria | Tag |
|---|---|---|---|---|
| **0: validate the engine** (blueprint: about 2–3 weeks, author's estimate) | AI SDK + OpenRouter; Langfuse Hobby; Postgres; promptfoo; optionally Label Studio | KB YAML for about 5 decision types<br>Layer 1 rules<br>The three arms<br>Blind A/B page<br>Per-debate token and cost logging<br>Waitlist showing a price<br>Founding-member checkout via MoR<br>Public no-login Layer 1 calculator as the waitlist's front door | **Gate:** engine arms clearly beat the single-LLM arm on the pre-registered rule.<br>**Separately:** record whether debate beats the engine without debate by enough to justify its **measured** cost.<br>Founding-member payments recorded | Recommendation (the gate itself is Decision-level in the blueprint) |
| **1: canvas core** | React Flow 12, React Flow UI, shadcn, dagre, Zustand, Better Auth, pg-boss, changedetection.io | **Week-one spike:**<br>• about 50 memoized custom nodes<br>• drawer opens without re-rendering the canvas<br>• swap-and-rewire as one undo step<br>• dagre left-to-right layout on 3–4 real AI architectures<br>**Then:** context chips, typed palette, drawer receipts, rules, blind-spot view, about 15 decision types, KB pipeline with human approval | Spike passes<br>Receipts render with sources and dates for all launch decision types | Recommendation |
| **2: launch features** | AI SDK streaming, AI Elements/streamdown rendering, MoR, PostHog EU, MADR + Mermaid, MCP registry | Numbers strip and 1x/10x/100x slider<br>Exports: design doc + MADR ADRs with Mermaid<br>Debate theater if Phase 0 earned it; otherwise an "experimental" opt-in<br>Credit ledger and plans<br>**Re-check alerts v0:** email + badge when a KB change touches a saved decision<br>Read-only MCP server | Paying users<br>Measured free-to-paid conversion<br>Alert open rate | Recommendation |
| **3: grow** | Yjs or @liveblocks/react-flow; WorkOS when asked; Archgate-compatible exports | GitHub App opening ADR and "superseded by" PRs<br>Team plan with free viewers and review links<br>Break-it mode<br>BYOK on Team<br>Real-time editing<br>More domains | Team revenue<br>Retention driven by alerts | Recommendation |

**The gate is about the canvas, not about debate.** If the engine beats a single model but debate adds nothing, the canvas still gets built. Debate then ships as the on-demand extra that v1 scope already describes (blueprint §6), without driving pricing or the pitch. The Decision that debates use several providers is untouched.

**Phase 0 is also the cheap moment to tune the debate.** Compare one exchange round against two or three. Trial early stopping when no advocate changes position, in the spirit of ARMOR-MAD's skip-when-agreeing routing ([arXiv 2606.13197](https://arxiv.org/abs/2606.13197)). Test a judge from a different model family than the advocates. **Recommendation.**

## Price near $25, count debates, sell through a merchant of record

Price anchors cluster in a narrow band.

| Comparable | Individual / starter | Team / business | Source |
|---|---|---|---|
| Eraser | $15 annual / $20 monthly per member, 40 AI credits | $45 / $60, 250 AI credits | [Eraser](https://www.eraser.io/pricing) |
| Jeda.ai | $10 / $39 a month | $298 a month (Alchemist) | [Jeda.ai](https://www.jeda.ai/pricing) |
| Architecto | $14 per member a month | $40 | [Architecto](https://architecto.dev/) |
| IcePanel | Free, 1 editor | $40 per editor, billed annually | [IcePanel](https://icepanel.io/pricing) |
| Warp | $20 a month, with $20 of usage at API rates | $50 per user, BYOK included | [Warp](https://www.warp.dev/pricing) |

**Recommended plan shape** (anchors Verified; plan design is a Recommendation, unvalidated):

- **Free:** one project, unlimited Layer 1 checks and calculators, about 3 debates a month.
- **Pro:** **$20 to $29 a month**, about 20% off annually. Includes a set number of debates, shown as a plain count rather than abstract credits.
- **Team:** **$40 to $60 per editor**, with free viewers. IcePanel, Mermaid and Eraser all offer free viewers, and review links become a growth loop.

**Hybrid pricing is the market norm.** Subscription plus usage is the most common B2B model, at **37%, up from 25%** a year earlier ([Growth Unhinged 2026](https://www.growthunhinged.com/p/the-state-of-b2b-monetization-in-2026)). Buyers want predictability, and heavy users dominate cost: "70-80% of token consumption comes from about 10% of users" ([Poyar](https://kylepoyar.substack.com/p/ai-credit-pricing)). A visible usage counter and a hard monthly ceiling therefore matter.

**Measure debate cost, then price it with a formula.** AI products averaged **45% gross margin in 2025** ([ICONIQ](https://www.iconiq.com/growth/reports/state-of-ai-2026)). A solo founder should aim higher, since Layer 1 is free and debates are capped. Price per debate must satisfy **P ≥ C / (1 − GM − f)**, where C is cost per debate, GM the target gross margin, and f the payment fee as a share of price.

**The notes' illustration** assumes 6 roles over 2 rounds, a 5,000-token shared context and 600 output tokens per turn. Advocates run on Claude Sonnet 5.5 ($2 in / $10 out per million tokens), and the judge runs on Opus 5.5 ($4 / $20), reading the full transcript ([Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing)). That gives **about $0.31 per debate, or about $0.21 with prompt caching**. At a 7.5 to 9% MoR fee, a 70% margin needs about **$1.40 to $1.50 per debate**.

**Applied to plans (my calc):**

- **Pro plan:** at $25 with 15 to 20 debates included, margin lands at roughly **66 to 80%**, depending on caching and the card fee. That clears 70% except at 20 uncached debates, assuming Layer 2 explanations stay cheap.
- **Debate packs:** the notes' example, a 25-debate pack priced at $20 to $25, lands at roughly **52 to 72%**. Only the $25 price with caching reaches 70%, so size packs from Phase 0's measured cost, not from this example.

**Keep packs large and skip lifetime deals.** Fixed fees make small packs wasteful: a $5 pack on Paddle loses 15% to fees ([Paddle pricing](https://www.paddle.com/pricing)). Sell packs of $20 or more. Avoid lifetime deals, because every debate costs model spend forever. **Recommendation.**

**Hold BYOK back until the Team tier.** BYOK (bring your own key) adds key-security work and removes the margin lever, so keep it off the individual tier at launch. It fits later on Team as a flat platform fee, as Warp does on its Business plan, where it doubles as a privacy selling point for EU teams. **Recommendation.**

### Payments if the founder is in India (Assumption: location unconfirmed)

Stripe direct is effectively closed to an India-based founder. Stripe India is invite-only and cannot onboard individuals ([Stripe India exports](https://docs.stripe.com/india-exports)), and **Stripe Managed Payments does not list India** among eligible seller locations ([eligibility](https://docs.stripe.com/payments/managed-payments/eligibility)). Four MoRs remain workable.

| MoR (Verified) | Fee | India support | Usage billing |
|---|---|---|---|
| Polar | 5% + 50¢ on Starter, +1.5% for non-US cards ([fees](https://polar.sh/docs/fees)) | Pays out to India via Stripe Connect Express, "even where standard Stripe is invite-only" ([countries](https://polar.sh/docs/merchant-of-record/supported-countries)) | Meters and Meter Credits |
| Dodo | 4% + 40¢ plus surcharges ([pricing](https://dodopayments.com/pricing)) | Indian individuals can onboard with a PAN; payouts in USD, GBP or EUR ([FAQ](https://docs.dodopayments.com/miscellaneous/faq)) | Credits that refresh each billing cycle |
| Paddle | 5% + 50¢ ([pricing](https://www.paddle.com/pricing)) | Markets to India-based companies ([Paddle India](https://www.paddle.com/billing/india)) | Beta; no top-ups ([docs](https://developer.paddle.com/build/usage-based-billing)) |
| Creem | 3.9% + 40¢ ([pricing](https://www.creem.io/pricing)) | India payouts supported; whether individuals can onboard is unconfirmed | Credit wallets |

**Recommendation:** shortlist Polar or Dodo, for their native credits and documented India payouts, and keep Paddle as the conservative fallback. Avoid Lemon Squeezy for a new build: it is steering users to Stripe Managed Payments and acknowledges "slower support responses" ([Lemon Squeezy 2026 update](https://www.lemonsqueezy.com/blog/2026-update)).

**India-side paperwork stays with the founder.** Exporting services needs a Letter of Undertaking (LUT) each financial year, plus FIRC/FIRA proof of foreign receipts ([Skydo](https://www.skydo.com/blog/export-of-services-under-gst)). A payment-gateway competitor warns that lump-sum MoR payouts can produce one e-FIRC that does not match individual invoices ([Razorpay, biased](https://razorpay.com/blog/merchant-of-record-vs-payment-gateway-india/)). Pick an MoR with itemized payout statements, and confirm GST treatment with a chartered accountant.

**If the founder is US- or EU-based instead,** Stripe Managed Payments adds **3.5% on top of standard Stripe fees** ([Stripe pricing](https://stripe.com/pricing)), roughly 7.9% all-in on a $20 US card charge (my calc). Polar and Paddle are equivalent options. Stripe direct plus Stripe Tax only makes sense once the founder is willing to register for EU OSS and UK VAT.

**Company buyers come later, and they ask for paperwork:**

- a GDPR Article 28 DPA ([GDPR Art. 28](https://gdpr-info.eu/art-28-gdpr/));
- a sub-processor list naming each LLM provider;
- a security page.

India has no EU adequacy decision ([European Commission](https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en)), so data transfers likely need Standard Contractual Clauses; confirm this with counsel. SOC 2 can wait until $50,000 to $100,000 or more of deals are blocked by it, per a compliance vendor's guidance ([Oneleet](https://www.oneleet.com/blog/shopping-guide-when-do-you-actually-need-soc-2-compliance)).

## Acquisition runs on free tools and artifacts, not launch spikes

**Launch spikes rarely convert directly.** Show HN requires "something you've made that other people can play with", ideally "without barriers such as signups", and it forbids landing pages ([Show HN rules](https://news.ycombinator.com/showhn.html)). Documented front-page results are sobering:

- Appliku drew 72 signups and "No new paid subscriptions" ([Indie Hackers](https://www.indiehackers.com/post/first-place-on-hackernews-stats-traffic-and-regs-46b8b95333)).
- Aidlab drew 500+ visitors and no direct conversions ([postmortem](https://www.indiehackers.com/post/front-page-of-hn-the-full-postmortem-traffic-lessons-surprises-cbe9e0a7f6)).

**Launch a free calculator instead.** The right Show HN artifact is a no-login **AI-app cost, latency and free-tier fit calculator**, or a single sourced verdict. It is built from Layer 1 at near-zero cost, with the product one click away. Eraser runs DiagramGPT exactly this way, as a free funnel into its editor ([Eraser DiagramGPT](https://www.eraser.io/diagramgpt)). "Engineering as marketing" works when the tool complements the paid product ([MicroConf](https://microconf.com/latest/engineering-as-marketing)). **Recommendation.**

**For search, publish a few dozen good pages, not thousands of generated ones.** Google's spam policy targets "using generative AI tools … to generate many pages without adding value" ([Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies)). And users click a traditional result in **8% of visits when an AI summary appears, versus 15% without** ([Pew](https://www.pewresearch.org/?p=270454)). Two kinds of page fit:

- hand-checked "X vs Y for <workload>" pages that reuse KB records, each with verified-on dates and an "open this decision in the canvas" button;
- a public gallery of reference architectures (RAG app, agent with tools), each with receipts.

Fresh, sourced data is something AI summaries cannot copy. **Recommendation.**

**Distribution surfaces are retention first and discovery second.**

- **MCP registries:** publish to the official registry, which feeds GitHub's ([GitHub MCP Registry](https://github.blog/ai-and-ml/generative-ai/how-to-find-install-and-manage-mcp-servers-with-the-github-mcp-registry/)), and to Anthropic's Connectors Directory, where listed connectors can appear as in-chat "Suggested Connectors" ranked by usage ([Claude directory](https://claude.com/docs/connectors/directory)).
- **Expect friction and bots:** one practitioner needed about 20 days and a Team plan (about €52 a month), and saw roughly 2,000 requests a day from the open registry, almost all bots ([DEV](https://dev.to/tantuc/how-to-get-an-mcp-server-into-the-claude-directory-20-days-eu52month-and-everything-the-docs-1nj2)). Count authenticated installs, not requests.
- **GitHub App:** committing MADR files into `docs/decisions/` puts the product's output where teammates review code. No acquisition data was found for this, so treat it as lock-in.

**Founder-led channels come before paid ones.** Answer architecture questions, using keyword alerts, in r/LLMDevs, the AI Engineer and Latent Space Discords, and the MLOps Community Slack. Build in public. Submit a talk to an AI Engineer event; their CFPs run on Sessionize ([AIEWF CFP](https://sessionize.com/aiewf2026)). Paid newsletter slots cost $500 to $4,000 on one seller's rate card ([Dupple](https://dupple.com/learn/newsletter-advertising-cost-2026)), and should wait until conversion is measured.

**Plan for low conversion.** A 3 to 5% freemium conversion rate counts as good, and developer products convert at about half the rate of others ([Lenny's Newsletter, 2023 data](https://lennysnewsletter.com/p/what-is-a-good-free-to-paid-conversion)). At $25 a month, 100 paying users (about $2.5k MRR) implies roughly **2,000 to 5,000 free signups**. This is a planning estimate.

**Validate up a ladder, and treat payment as the real signal:**

1. a waitlist that shows a price;
2. a refundable founding-member pre-order at the real price;
3. the blind test.

Waitlist conversion figures are vendor estimates spanning 1 to 30% ([LaunchList](https://getlaunchlist.com/blog/convert-waitlist-to-paying-customers)), which is why payment is the stronger signal. Paddle's domain review requires live Terms, Refund and Privacy pages and a visible price before checkout ([Paddle](https://www.paddle.com/help/start/account-verification/why-has-my-domain-been-rejected)). That conveniently forces the pricing page to exist early.

**Recruit blind testers from the same communities.** Offer a $50 to $100 gift card or 6 to 12 months of free Pro. Respondent is a paid fallback at $80 per B2B session plus the incentive ([Respondent](https://www.respondent.io/pricing)). **Recommendation.**

## Seventeen places the research sharpens the blueprint

Each row names a blueprint section, what the research found, and the proposed change, so the founder can update the blueprint line by line.

| Blueprint section | What the research found | Proposed change | Tag |
|---|---|---|---|
| §3 Competitors | **Catio** is missing: an "Architecture IDE" with a Decide stage, an MCP server, and about $7M reported raised; enterprise and sales-assisted ([Catio](https://www.catio.tech/), [CO/AI](https://getcoai.com/news/catio-raises-7m-to-transform-tech-diagrams-with-31-ai-agents/)). Also missing: beforeyouship.dev, AgentDeals, better-plan-mode, Hopsule, Workik, and next-ai-draw-io (Apache-2.0, 36.1k stars) | Add them; position against Catio as AI-app-specific and self-serve | Verified + Recommendation |
| §3 Competitors | Jeda.ai says "your team validates and decides". Eraser's "Decision Node" is a newsletter, not a feature ([Eraser](https://www.eraser.io/decision-node)). Architecto, IcePanel, verd and Archgate have now been opened in full. MAD-Arch remains unverified | Update those rows; keep "never claim no competitors" | Verified |
| §8 / §14 Debate | Results are mixed or negative at equal compute; conformity causes failures; debate is commoditized | Keep multi-provider debate (Decision) but make it optional<br>Add the "engine without debate" arm<br>Test 1 vs 2–3 rounds<br>Advocates keep their assigned stance<br>Role voices never see vote tallies<br>Judge comes from a different model family | Recommendation |
| §2 Pitch | MCP and ADR export are table stakes; receipts, simulator and alerts are the open combination | Lead with those three | Recommendation |
| §6 v1 scope | Alerts are the retention engine, and the KB pipeline already produces the change events they need | Add minimal re-check alerts in Phase 2 | Recommendation |
| §9 / §16 Streaming and hosting | Vercel caps streams at 300 or 800 seconds, and its Hobby plan is non-commercial<br>Railway closes connections after 5 idle minutes<br>Neon's pooler lacks LISTEN/NOTIFY<br>In the AI SDK, a client abort is not a stop | Long-running containers<br>Postgres events table<br>Keepalives and `Last-Event-ID`<br>Stop endpoint plus grace-period cancel | Verified + Recommendation |
| §8 Gateway (open) | OpenRouter: 5.5% fee, per-response `usage.cost`, failover<br>Vercel AI Gateway: no markup<br>Self-hosted LiteLLM needs Postgres and Redis, and had a [PyPI compromise on 2026-03-24](https://www.arthur.ai/column/litellm-supply-chain-attack-pypi-compromise-2026)<br>Helicone is in maintenance mode; Portkey went to Palo Alto Networks | OpenRouter or Vercel, behind your own `LLMClient` | Verified + Recommendation |
| §8 Structured output | AI SDK 7 deprecates `generateObject`/`streamObject`<br>Claude citations are incompatible with JSON outputs ([Claude](https://platform.claude.com/docs/en/build-with-claude/structured-outputs))<br>Gemini supports only a subset of JSON Schema | The judge cites via a `cited_kb_ids` field, checked by a validator; keep schemas flat | Verified + Recommendation |
| §10 Cache | The blueprint's key omits rules, prompt and model versions; semantic caching is unsafe here | Exact-hash Postgres table with the extended key; no Redis | Recommendation |
| §12 Freshness (open) | genai-prices uses 30-day re-checks; free-tier behaviours matter as much as numbers | TTLs of 30/30/90/180 days<br>`source_quote`, `curator_note` and behaviour fields<br>First-party latency harness | Recommendation |
| §7 / §12 Data sources | Artificial Analysis, the OpenRouter catalog, LMArena, VectorHub, free-for-dev, DB-Engines and the Radar forbid redisplay or carry no license | Link out only; the stricter Artificial Analysis terms govern | Verified |
| §9 Canvas library | React Flow 12.12.0 is MIT<br>Excalidraw is **MIT at source** ([LICENSE](https://github.com/excalidraw/excalidraw/blob/master/LICENSE))<br>tldraw's production license key is confirmed<br>React Flow asks non-subscribers to keep its attribution | React Flow plus one month of Pro; legal review of vendor logos | Verified + Recommendation |
| §13 / §16 Billing | Stripe India is invite-only<br>Managed Payments excludes India<br>Stripe meters cannot enforce live balances<br>Paddle usage billing is in beta | MoR plus your own ledger; packs of $20+; no lifetime deals | Verified + Recommendation (founder location is an Assumption) |
| §13 Plan shape | Free viewers are standard; credits feel like a black box; BYOK appears on business tiers | Show debates as counts<br>Free viewers on Team<br>BYOK later<br>$20–29 and $40–60 anchors | Recommendation |
| §13 / §14 Willingness to pay | Waitlist conversion data comes only from vendors | Add a refundable founding-member pre-order | Recommendation |
| §10 / §15 Privacy | Claude API inference is US/global only<br>OpenAI's EU endpoint needs MAM/ZDR approval<br>India lacks an EU adequacy decision | EU hosting, a DPA, a sub-processor list naming LLM providers; counsel on SCCs and Art. 27 | Verified + Recommendation |
| §6 Exports / §15 "Easy to copy" | GitHub renders only Mermaid inline; MADR is MIT/CC0; the free substitute is a coding agent plus skills and MCP data | Export MADR + Mermaid via PRs; compete on sourced facts and consistency | Verified + Recommendation |

## What remains unverified

Several facts that matter for build and launch decisions could not be pinned down.

**Prices and terms:**

- React Flow Pro's price conflicts between pages: $169 a month versus "from €129" ([Pro page](https://reactflow.dev/pro), [Pro content](https://reactflow.dev/pro/content)).
- tldraw's commercial price is unpublished.
- Artificial Analysis's free quota differs between its own pages.
- OpenRouter's structured-output support must be checked per model at build time.
- No observability tool offers a per-user cost export fit for billing, which is why the ledger must be first-party.

**The evidence the product rests on:**

- No study tests multi-model debate on architecture decisions, and the MAD-Arch paper could not be opened.
- Real token counts per debate are unknown until Phase 0.
- No willingness-to-pay data exists for receipts or alerts.
- No public data links MCP listings or GitHub Apps to paid signups for small vendors.
- No hands-on trials were run, so Jeda's AI Matrix scoring, Catio's pricing and Eraser's latest changelog are unconfirmed.

**Legal and compliance:**

- Paddle's seller-side requirements for India are undocumented.
- GST treatment of sales through a foreign MoR needs a chartered accountant.
- Counsel is needed on whether an EU representative is required, and on how vendor logos may be used in a paid palette.
- D2's TALA layout engine is described as paid by Terrastruct ([TALA](https://terrastruct.com/tala/)), while a README in D2's repo now says its runtime source falls under D2's own license ([TALA README](https://raw.githubusercontent.com/terrastruct/d2/master/d2layouts/d2talalayout/README.md)). The product does not need TALA either way.

**Not researched:** the MCP TypeScript SDK, GitHub App mechanics, job-queue options beyond Postgres, and EU regions for Trigger.dev and Inngest Cloud.

## Conclusion

The build-versus-buy line and the trust line turn out to be the same line. Everything a user must be able to trust is unavailable off the shelf and must be built: the facts with their sources and dates, the elimination rules, the citations a judge may make, and the freshness of all of it. Much of what is freely available, from aggregator benchmarks to comparison lists, cannot legally be shown in a paid product. Meanwhile, everything a user merely needs to work is commodity and permissively licensed: the canvas, the streaming, auth, payments, analytics. That makes the knowledge base, not the canvas or the debate, the asset whose quality decides whether the product is worth $25 a month. It also turns the KB update pipeline from a back-office chore into the source of the product's best feature, alerts on saved decisions.

The biggest remaining risk is commercial, not technical. Nobody has shown that developers will pay for receipts and alerts, or that debate improves architecture verdicts. Both are cheap to test before the canvas exists, with a three-arm blind test and a paid founding-member pre-order on a plain page. If the engine without debate wins, the founder saves money and months. If receipts win but debate does not, the product still has a pitch that free councils and coding agents cannot match.
