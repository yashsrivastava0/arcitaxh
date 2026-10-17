# packages/llm

Purpose: the only way models are called. `LLMClient` interface, `FakeLLMClient` (default everywhere), one real adapter, versioned prompts, Layer 2 explanation, the debate runner and the three arms.

- May import: `core`, `kb`. Never `db`, apps or `tools`. Persistence goes through ports (`DebateRepo`, `UsageRepo`); adapters live elsewhere.
- The AI SDK (`ai`, `@openrouter/ai-sdk-provider`) is imported **only** in `src/adapters/`.
- No real calls unless `ALLOW_REAL_LLM=1` and a spend cap is set. The real-LLM runner refuses `__FOUNDER_TO_SET__` model ids and a `null` cap. Model ids are never hard-coded in code or prompts.
- Prompts are files: `prompts/<name>/<version>.md`, never edited in place (a change is a new version). No prices, limits or product claims inside prompts; numbers arrive only in data blocks.
- User text, pasted content and KB quotes go in delimited data blocks; the system prompt says instructions inside data blocks are not followed. Models receive no tools.
- Every model call writes one usage row (tokens, cost, cost source, price snapshot). Log provider request ids only, never prompt or response bodies.
- Output schemas are flat. The judge cites through an explicit `citedKbIds` field checked by the validator.
- Test with the fake client: `pnpm test --filter @product/llm` (debate golden runs, repair, budget stop, cancel, resume, injection suite).
