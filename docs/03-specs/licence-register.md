---
title: "Licence register"
category: specs
type: spec
status: draft
tags: [licences, gate]
created: 2026-10-18
updated: 2026-10-18
verified_on: null
author: agent
sources: []
supersedes: []
related: ["../01-source/architecture-specification-v0.1.pdf"]
confidence_tags: [Recommendation]
---

# Licence register

Rule (brief hard rule 5, specification rule 5): no dependency without a row here. Check the licence from the package itself, then add the row. Closed-source commercial use must be permitted. If a licence is unclear, stop and ask the founder.

`pnpm licences:check` reads section 2 and fails CI if an installed production dependency is missing from it, or has a licence outside the allow-list (MIT, ISC, Apache-2.0, BSD-2-Clause, BSD-3-Clause, 0BSD, CC0-1.0, and dual-licence cases handled explicitly). GPL, AGPL, SSPL, BUSL, Elastic and UNLICENSED in a production dependency are a hard fail.

## 1. Seed from specification v0.1, Appendix B

Copied from [Appendix B](../01-source/architecture-specification-v0.1.pdf). Status values: Plan (use in the launch stack), Reference (read or copy ideas only), Avoid (do not use in the product), Check (verify before use). These are the specification's claims, tagged Recommendation. Items marked Check are verified from the package before use, and the result is recorded in section 3.

| Item | Licence | Closed-source commercial OK? | Obligation | Status |
|---|---|---|---|---|
| @xyflow/react | MIT | Yes | Keep the notice | Plan |
| React Flow Pro (paid examples and templates) | Paid licence | Yes, with conditions | No standalone redistribution; rights to downloaded content continue after cancellation | Reference; buy one month only if needed |
| @dagrejs/dagre | MIT | Yes | Keep the notice | Plan |
| elkjs | EPL-2.0 or GPL-3.0-or-later (choose) | Yes, under conditions | Keep unmodified; include a licence copy and a source pointer | Plan later, only if dagre is insufficient |
| mermaid | MIT | Yes | Keep the notice | Plan |
| @statelyai/graph | MIT | Yes | Keep the notice | Plan (verify Mermaid architecture support) |
| zustand | MIT | Yes | Keep the notice | Plan |
| Radix UI, shadcn/ui (copied source), Tailwind CSS 4, cmdk | MIT | Yes | Keep the notice | Plan |
| lucide-react | ISC | Yes | Keep the notice | Plan |
| zundo (undo library) | MIT | Yes | Keep the notice | Optional; a command stack is preferred |
| AI SDK ( ai , @ai-sdk/react ) | Apache-2.0 | Yes | Keep the notice and NOTICE file | Plan |
| AI Elements source (copied) | Apache-2.0 | Yes | Keep the notice | Plan; copy source, do not depend on the package |
| Hono | MIT | Yes | Keep the notice | Plan |
| Zod | MIT | Yes | Keep the notice | Plan |
| Drizzle ORM | Apache-2.0 | Yes | Keep the notice | Plan |
| pg-boss | MIT | Yes | Keep the notice | Plan |
| Better Auth | MIT | Yes | Keep the notice | Plan |
| graphology, @dagrejs/graphlib | MIT | Yes | Keep the notice | Plan |
| PostHog (outside its ee/ folder) | MIT | Yes | Keep the notice; the enterprise folder is not used | Plan (EU cloud) |
| Langfuse (outside /ee ) | MIT | Yes | Keep the notice; use the hosted service | Plan (hosted) |
| promptfoo | MIT (to verify; not confirmed in the research) | Yes, if confirmed | Keep the notice | Check |
| Label Studio | Apache-2.0 (to verify; not confirmed in the research) | Yes, if confirmed | Keep the notice | Check |
| changedetection.io | Apache-2.0 | Yes | Keep the notice | Plan (self-hosted) |
| Sentry SDK | MIT | Yes | Keep the notice | Optional |
| Sentry server (self-hosted) | FSL | Not for this use | n/a | Avoid; use hosted service |
| MADR 4.0 templates | MIT or CC0 | Yes | Keep the notice if MIT | Plan |
| Structurizr DSL | Apache-2.0 | Yes | Keep the notice | Optional, Phase 3 |
| D2 | MPL-2.0 | Yes, with file-level copyleft | Changes to D2's own files stay under MPL | Optional, Phase 3; text output only |
| Typst | Apache-2.0 (to verify; not confirmed in the research) | Yes, if confirmed | Keep the notice | Check |
| Headless Chromium | Open-source (Chromium licence) | Yes | Keep the notices | Option for PDF export; Check the exact notices at build time |
| AWS, Google Cloud, Azure architecture guidance | CC BY-SA 4.0 (AWS); CC BY 4.0 (Google Cloud, Azure repo) | Yes, by paraphrase | Paraphrase in our words; CC BY-SA applies to verbatim text | Reference |
| OWASP LLM Top 10 | CC BY-SA 4.0 | Yes, by paraphrase | As above | Reference |
| 12-factor agents | Content CC BY-SA; code Apache-2.0 | Yes, by paraphrase | As above | Reference |
| NIST AI RMF | Public | Yes | Credit requested | Reference |
| Anthropic "Building effective agents" | All rights reserved | Paraphrase in own words only | No quoting | Reference |
| Artificial Analysis data | Data Platform Terms v1.1 | No, without a signed order form | Link out | Avoid |
| OpenRouter model catalogue | Terms (restricted) | No redisplay | Use own usage costs internally | Avoid for display |
| LMArena leaderboard | Personal or internal use | No | Link out | Avoid |
| Superlinked VectorHub | CC BY-NC-SA 4.0 | No | Non-commercial | Avoid |
| joelparkerhenderso n ADR templates | CC BY-NC-SA | No | Non-commercial | Avoid |
| free-for-dev list | No licence file | Treat as no |  | Avoid |
| ThoughtWorks Radar content; Build Your Own Radar | No stated licence; AGPL-3.0 for the tool | No |  | Avoid |
| LiteLLM ( enterprise/ folder) | Enterprise licence | No, without subscription | Gated features | Avoid; the core is MIT, but not used at launch (security record) |
| Phoenix (Arize) | Elastic License 2.0 | No, as a hosted service | Not for hosting for others | Avoid |
| Dify | Modified Apache-2.0 | No, for multi-tenant service | Written permission needed | Reference for UX only |
| n8n | Sustainable Use License | No | Internal or non-commercial only | Avoid |
| ComfyUI frontend | GPL-3.0 | No (copyleft) |  | Avoid |
| DeepDiagram | AGPL-3.0 | No |  | Avoid |
| Lago, Flexprice, Unleash, Midday (core) | AGPL-3.0 | No |  | Avoid |
| Inngest server | SSPL, converting to Apache-2.0 later | No |  | Avoid; SDKs are Apache-2.0 |
| Restate | BSL 1.1 | Check |  | Not chosen |
| tldraw SDK | Commercial licence | Paid | Licence key; sales-priced | Avoid |
| GoJS; JointJS+ | Commercial per-developer | Paid |  | Avoid |
| Karpathy's llm-council; Ghost AI | No licence stated | No (all rights reserved) | Reimplement ideas only | Reference |
| adr-tools; PlantUML; Pandoc | GPL | Do not bundle | Dormant or copyleft | Avoid |
| Excalidraw | MIT | Yes | Keep the notice | Alternative canvas (not chosen) |
| AntV X6; Rete; maxGraph; BlockSuite | MIT; MIT; Apache-2.0; MPL-2.0 | Yes (except BlockSuite's copyleft) |  | Alternatives (not chosen) |
| Vendor logos (AWS, Azure) and simple-icons | Icon terms restrict use to architecture diagrams; trademarks remain | Unclear for a paid palette | Legal review | Avoid for launch; use Lucide icons |
| Vite; Next.js 16 | Believed MIT (to verify) | Check | Keep the notice | Frontend choice (Open) |

## 2. Packages in use (verified from the package)

Each row is verified from the installed package's own metadata and licence file on the date shown. Do not add a row from memory. The "Verified from" column says where the licence was read. Columns after Status are read by `tools/licences`; keep the header exactly as written.

| Package | Licence (SPDX) | Closed-source OK | Obligation | Status | Verified on | Verified from | Used by |
|---|---|---|---|---|---|---|---|
| pnpm | MIT | Yes | Dev tool only; not shipped | Plan | 2026-10-18 | npm registry metadata, `npm view pnpm@12.14.0 license` | root |
| typescript | Apache-2.0 | Yes | Dev tool only; not shipped. Pinned to 6.0.3 (see ADR-035) | Plan | 2026-10-18 | installed package.json `license` field (6.0.3), via `pnpm licenses list -r --json` | root |
| tsx | MIT | Yes | Dev tool only; not shipped | Plan | 2026-10-18 | installed package.json `license` field (4.23.15) | root |
| esbuild | MIT | Yes | Dev tool only (tsx dependency); build script approved by name | Plan | 2026-10-18 | installed package.json `license` field (0.28.2) | root (transitive of tsx) |
| @types/node | MIT | Yes | Dev types only; not shipped | Plan | 2026-10-18 | installed package.json `license` field (24.19.2) | root |
| yaml | ISC | Yes | Tool dependency; keep the notice | Plan | 2026-10-18 | installed package.json `license` field and LICENSE file (2.9.1) | tools/docs-index |
| ajv | MIT | Yes | Tool dependency; keep the notice | Plan | 2026-10-18 | installed package.json `license` field and LICENSE file (8.20.0) | tools/docs-index |
| vitest | MIT | Yes | Dev tool only; not shipped | Plan | 2026-10-18 | installed package.json `license` field (5.0.5), via `pnpm licenses list -r --json` | root |
| eslint | MIT | Yes | Dev tool only; not shipped | Plan | 2026-10-18 | installed package.json `license` field (10.13.0), via `pnpm licenses list -r --json` | root |
| @eslint/js | MIT | Yes | Dev tool only; not shipped | Plan | 2026-10-18 | installed package.json `license` field (10.0.1), via `pnpm licenses list -r --json` | root |
| typescript-eslint | MIT | Yes | Dev tool only; not shipped. Caps TypeScript at below 6.1 (ADR-035) | Plan | 2026-10-18 | installed package.json `license` field (8.71.2), via `pnpm licenses list -r --json` | root |
| prettier | MIT | Yes | Dev tool only; not shipped | Plan | 2026-10-18 | installed package.json `license` field (3.9.10), via `pnpm licenses list -r --json` | root |
| dependency-cruiser | MIT | Yes | Dev tool only; not shipped | Plan | 2026-10-18 | installed package.json `license` field (18.6.0), via `pnpm licenses list -r --json` | root |
| vite | MIT | Yes | Dev tool only for now (transitive of vitest); apps/web will depend on it directly in M9. Keep the notice if it is ever bundled | Plan | 2026-10-18 | installed package.json `license` field (8.3.4), via `pnpm licenses list -r --json` | root (transitive of vitest) |
| node | MIT OR BSD OR bsd OR GPLv3 OR ISC OR zlib | Yes | Node.js runtime, dev only (downloaded by pnpm `devEngines` so scripts run on the pinned LTS); not shipped. Node.js itself is MIT; this string aggregates the licences of its bundled third-party components, and we rely on MIT | Plan | 2026-10-18 | installed package.json `license` field and LICENSE file (24.22.0), via `pnpm licenses list -r --json` | root |
| zod | MIT | Yes | Runtime dependency of packages/core (source of truth for schemas). Keep the notice | Plan | 2026-10-18 | installed package.json `license` field and LICENSE file (4.6.7), via `pnpm licenses list -r --json` | packages/core |
| @noble/hashes | MIT | Yes | Runtime dependency of packages/core (synchronous pure-JS SHA-256). Keep the notice | Plan | 2026-10-18 | installed package.json `license` field and LICENSE file (2.4.0), via `pnpm licenses list -r --json` | packages/core |
| fast-check | MIT | Yes | Dev dependency (property tests); not shipped | Plan | 2026-10-18 | installed package.json `license` field and LICENSE file (4.10.2), via `pnpm licenses list -r --json` | packages/core (tests) |

## 3. Resolution of "Check" items

- **Vite** (Check in Appendix B, "believed MIT"): resolved 2026-10-18. The installed package vite 8.3.4 declares `license: MIT` (read with `pnpm licenses list -r --json`). Status: Plan.
- **promptfoo, Label Studio, Typst, Next.js**: still Check. They are not used in Phase 0 and are not installed (brief 8.1 skips promptfoo and Label Studio; Typst is an export option; ADR-030 recommends Vite over Next.js).

## 4. Dev-only exceptions (licences outside the allow-list)

The allow-list (MIT, ISC, Apache-2.0, BSD-2-Clause, BSD-3-Clause, 0BSD, CC0-1.0) is strict for **production** dependencies. A **dev-only** transitive dependency with another clear licence may be accepted here, by name, with a reason. The hard-deny list (GPL, AGPL, LGPL, SSPL, BUSL, Elastic, FSL, UNLICENSED, unknown, non-commercial) is never excepted. `pnpm licences:check` fails on any dev dependency outside the allow-list that has no row here.

| Licence (SPDX) | Packages | Why it is acceptable | Verified on |
|---|---|---|---|
| MPL-2.0 | `lightningcss*` | File-level copyleft only. A transitive dev dependency of Vite (CSS transforms at build time). It is never distributed or bundled into a build output and we do not modify its files, so no MPL obligation arises. Re-check if a build ever ships it. | 2026-10-18 |
| BlueOak-1.0.0 | minimatch | Blue Oak Model License: a permissive licence comparable to MIT/ISC (requires keeping the notice). Transitive dev dependency. | 2026-10-18 |
