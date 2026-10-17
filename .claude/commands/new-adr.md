---
description: Create the next ADR (MADR 4.0) from the template
argument-hint: <title>
---

Create an ADR titled `$ARGUMENTS`.

1. Find the highest number in `docs/04-decisions/` and add one (the first new ADR is 032).
2. Copy `docs/_templates/adr.md` to `docs/04-decisions/NNNN-<kebab-title>.md`. Set `title`, `adr`, `adr_status` (Decision only if the founder settled it; otherwise Recommendation or Open), `created`/`updated` = today.
3. Fill context, considered options, outcome, consequences and confirmation (how compliance is checked). Link the spec section or research note it rests on. Do not invent facts; tag unverified claims Assumption.
4. Run `pnpm docs:index` and `pnpm docs:check`. Report the path and the status you chose.
