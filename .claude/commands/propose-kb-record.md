---
description: Fetch a vendor page, snapshot it, and draft a KB record PROPOSAL for the founder to review
argument-hint: <url>
---

Draft a proposal from `$ARGUMENTS`. Use the `kb-curator` subagent for the fetch and drafting.

Rules (hard): proposals only. Never write into `kb/records/`. Never write a fact from memory; every value must come from the fetched page.

1. Fetch the vendor's own page (not an aggregator, not a catalogue whose terms forbid redisplay: Artificial Analysis, OpenRouter catalogue, LMArena, VectorHub, free-for-dev, DB-Engines, ThoughtWorks Radar).
2. Save the extracted page text to `kb/snapshots/<record-id>.txt` with the URL and today's retrieval date at the top.
3. Draft `kb/proposals/<record-id>.yaml` in the record envelope (see the `kb-record-authoring` skill): `status: proposed`, `verified_by: null`, `last_verified` and `valid_until` left null, the `source.url`, `source.retrieved_on` = today, and an **exact sentence copied from the page** as `source.quote`. Typed `body` fields only from what the quote supports. If the page contradicts itself, say which value you chose in `curator_note`.
4. Run the quote check: the quote must appear verbatim in the snapshot, every number in the proposal must appear in the quote, and the URL must match the page fetched. Fix or discard on failure.
5. Report the proposal path, the quote, and what the founder must verify against the live page before promoting it.
