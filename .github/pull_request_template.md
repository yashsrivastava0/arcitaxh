## What and why

<!-- One or two sentences. Link the milestone (M0..M11) and any ADR. -->

## Definition of done (specification 15.2)

- [ ] Its tests pass (`pnpm run ci`), including the layers that block a release for this change.
- [ ] Its analytics events are defined and its errors / log fields are defined (no request or response bodies in logs).
- [ ] The specification or docs are updated if behaviour changed, with a proposed changelog line in `docs/05-phases/phase-0/spec-change-proposals.md` (the spec itself is not edited).
- [ ] Every new dependency has a row in `docs/03-specs/licence-register.md`, with the licence read from the package.
- [ ] Any model-calling change reports its cost impact and has a cap; no real LLM call runs without `ALLOW_REAL_LLM=1` and a spend cap.
- [ ] Keyboard and screen-reader behaviour is checked for any new interactive element.
- [ ] Anything that costs money sits behind a flag.

## Hard rules

- [ ] No invented prices, limits, model ids, versions, licences or competitor features.
- [ ] `packages/core` still performs no I/O (no clock, randomness, env, fs, network).
- [ ] Missing or expired data still never decides (P9).
- [ ] No real KB facts written from memory; nothing written directly into `kb/records/`.
- [ ] No secrets committed.
- [ ] Nothing out of Phase 0 scope was built (canvas, accounts, billing, streaming, exports, MCP, GitHub App).

## Handoff

- [ ] `docs/05-phases/phase-0/status.md` updated (done, next, blockers, questions).
- [ ] Decisions made here have an ADR; conflicts are in `conflicts.md`; out-of-scope ideas are in `parking-lot.md`.
