---
description: Run the KB release checks and summarise failures
---

Run `pnpm kb:check`, then `pnpm kb:sweep`.

Summarise by failure type: schema, placeholder values, quote not found in snapshot, expired records for launch types, dangling citations, wrong `valid_until` for the record type's TTL, and records due within 7 days. Name each file. Do not fix a failing real record by editing it; if the data is wrong, say what the founder must re-verify. If `pnpm kb:check` does not exist yet, say that milestone M3 is not done.
