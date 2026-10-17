# kb/

Purpose: the knowledge base as code. It holds every fact the product shows as fact. It is the asset whose quality decides whether the product is worth paying for, and the largest risk (stale data).

**Never write real facts from memory.** No real price, limit, capability or latency number, ever. You may (a) write FAKE records in `kb/fixtures/` with obviously fake vendors (`vendor.example`) for tests and golden designs, and (b) draft *proposals* in `kb/proposals/` from a vendor page you actually fetched, with the page text saved to `kb/snapshots/`, an exact quote, URL and retrieval date, `status: proposed`, `verified_by: null`. The founder checks the quote against the live page and promotes it to `kb/records/`. **You never write into `kb/records/`.**

Principles (spec 8.1):
- K1 Every record has a source URL, an exact quote from that page, a last-verified date, a valid-until date, the verifier's name and a curator note.
- K2 Records are versioned; each release is a git tag (`kb-YYYY.MM.N`); a verdict stores the version it used.
- K3 An expired record is shown as expired and cannot eliminate an option.
- K4 Third-party data is a signal, or linked, unless its licence allows display (see the source register, spec 8.6; Artificial Analysis, OpenRouter catalogue and LMArena are never used).
- K5 Models never write records. A model may propose; a person approves.
- K6 Behaviour is data: free-tier behaviours and capabilities are typed fields, not prose.
- K7 Small and complete for the launch decision types beats large and partly right.

Layout: `decision-types/`, `options/<dt>/`, `records/<dt>/`, `proposals/`, `snapshots/`, `schema/` (GENERATED, never hand-edit), `fixtures/` (tests only, never shipped), `CHANGELOG.md`. Check with `pnpm kb:check`. See `.claude/skills/kb-record-authoring/`.
