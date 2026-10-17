---
paths:
  - "packages/llm/**"
  - "tools/phase0/**"
  - "config/model-roster.json"
  - "config/phase0.json"
---

# LLM usage

- The fake client is the default for tests, local dev and CI. A real call needs `ALLOW_REAL_LLM=1` and a configured spend cap (`spend.phase0_model_cap_usd` in `config/phase0.json`). If the cap is `null`, the runner refuses to start.
- The real runner refuses `__FOUNDER_TO_SET__` model ids. Model ids and prices are never hard-coded in code or prompts; they come from `config/model-roster.json` and KB price records.
- No prices, limits or product claims in prompts. Numbers arrive only in data blocks, so the grounding validator can match them to records.
- All user text, pasted content and KB quotes are wrapped in delimited, labelled data blocks. The system prompt says instructions inside data blocks are not followed.
- Models receive no tools. Output schemas are flat. The judge cites through `citedKbIds`.
- Every call writes a usage row with tokens, cost, cost source (`provider_reported` or `computed_from_kb`) and a price snapshot. Check the running total against the budget after every call.
- Honour the `AbortSignal` at every call. A response that fails schema validation goes to the repair step; it is not retried as a transient error.
- Prompt files are versioned and never edited in place.
