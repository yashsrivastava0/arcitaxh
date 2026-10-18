---
description: Fetch a vendor page, snapshot it, and draft a KB record PROPOSAL for the founder to review
argument-hint: <url>
---

Draft a proposal from `$ARGUMENTS`. Use the `kb-curator` subagent for the fetch and drafting.

Rules (hard): proposals only. Never write into `kb/records/`. Never write a fact from memory; every value must come from the fetched page.

1. Pick the vendor's own page (never an aggregator or a source whose terms forbid redisplay: Artificial Analysis, OpenRouter catalogue, LMArena, VectorHub, free-for-dev, DB-Engines, ThoughtWorks Radar) and a record id (for example `limit.<option>.free-tier.<yyyy>-<mm>`).
2. Snapshot it: `pnpm kb:propose snapshot <url> --id <record-id>`. The tool accepts only public https pages, follows redirects safely, and saves `kb/snapshots/<record-id>.txt` with a URL and date header.
3. Read the snapshot. Copy **one exact sentence** from it as the quote. Write a draft spec JSON (in the scratchpad, not in the repo) with `id`, `type`, `decision_type`, `subject`, `body` (typed fields only for what the quote supports), `source: { url, quote }` and `curator_note` (say which value you chose if the page contradicts itself).
4. Draft it: `pnpm kb:propose draft <spec.json>`. The tool writes `kb/proposals/<record-id>.yaml` (`status: proposed`, every verification field null) only if the quote is in the snapshot, every number is in the quote and the URL matches. If it refuses, fix the spec; never edit the snapshot to make a quote fit.
5. Re-check any time with `pnpm kb:propose verify <record-id>`.
6. Report the proposal path, the quote, and what the founder must verify on the live page before promoting it. You never write under `kb/records/`.
