---
name: kb-record-authoring
description: How to write or review a knowledge-base record or proposal: the envelope, typed bodies, behaviour enums, freshness TTLs and the quote rules. Use when drafting kb/proposals, writing kb/fixtures, or reviewing a record before promotion.
---

# KB record authoring

Read `kb/CLAUDE.md` first. The two non-negotiables:

1. **Never write a real fact from memory.** Fake records (vendor `vendor.example`) go in `kb/fixtures/`. Real facts arrive only as proposals in `kb/proposals/`, drafted from a vendor page you fetched this run, with the page text saved in `kb/snapshots/`. You never write into `kb/records/`; the founder promotes after checking the quote against the live page.
2. **Quote rules**: `source.quote` is one exact sentence copied from the page. It must appear verbatim in the snapshot. Every number in the record must appear in the quote. `source.url` must be the page fetched.

Reference files (load only what you need):
- [envelope.md](./envelope.md): the shared record envelope and an annotated example.
- [bodies-and-enums.md](./bodies-and-enums.md): typed bodies per record type and the behaviour enums.
- [freshness.md](./freshness.md): TTLs, states and how `valid_until` is computed.

Workflow for a proposal: pick the record type; fetch the vendor's own page; save the snapshot; copy the quote; fill only the body fields the quote supports; leave `verified_by`, `last_verified` and `valid_until` for the founder; run the quote check; hand over with a list of what to verify. If the page contradicts itself, choose a value and explain in `curator_note`. If a fact is not on the page, say so.
