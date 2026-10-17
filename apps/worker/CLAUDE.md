# apps/worker

PLACEHOLDER. Filled in Phase 2 (pg-boss jobs: debate runs, KB import, expiry sweep, alert evaluation, export rendering).

- Do not build anything here in Phase 0 and do not install pg-boss or any other dependency for it.
- The Phase 0 debate runner in `packages/llm` is written so a Phase 2 worker can wrap it unchanged (state machine, `AbortSignal`, ports for persistence).
