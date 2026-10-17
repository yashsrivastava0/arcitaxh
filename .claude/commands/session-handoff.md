---
description: End-of-session handoff: update status.md, ADRs, conflicts and parking lot, leave the repo green
---

Prepare the handoff.

1. Run the checks that exist (`pnpm docs:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm check:boundaries`, `pnpm licences:check`). Report failures honestly; fix the ones you caused.
2. Make sure every decision made this session has an ADR (`/new-adr`), every document conflict is in `conflicts.md`, every out-of-scope idea is in `parking-lot.md`, and every new question is in `questions.md`.
3. Update `docs/05-phases/phase-0/status.md` (what is done, what is next, blockers, questions, environment notes).
4. Run `pnpm docs:index` and `pnpm docs:check`.
5. Summarise in five lines: done, next, blockers, questions, anything left red.
