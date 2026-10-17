---
description: Scaffold a KB decision type (structure only, no real facts)
argument-hint: <decision-type-id>
---

Scaffold the decision type `$ARGUMENTS`.

1. Read `kb/CLAUDE.md` and the `kb-record-authoring` skill. The id is kebab-case.
2. Check whether the founder has confirmed this id as one of the Phase 0 decision types (`docs/05-phases/phase-0/questions.md`, question 1). If not, stop and ask.
3. Create `kb/decision-types/<id>.yaml` (applicability, required chips, rules list, deferral option, palette mapping) following the existing `vector-store.yaml`. Create the empty folders `kb/options/<id>/` and `kb/records/<id>/` with a `.gitkeep`.
4. Write a fixture-only vertical slice in `kb/fixtures/` with obviously fake vendors (`vendor.example`) if tests need one. **Never write a real price, limit, capability or latency number, and never write into `kb/records/`.**
5. Run `pnpm kb:check` and report. Real records come later via `/propose-kb-record`.
