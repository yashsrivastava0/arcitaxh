# apps/api

Purpose: Hono server on Node (long-running container assumption). Phase 0 is minimal: KB reads, `/v1/analyze`, `/v1/verdict`, `/v1/explain`, `/v1/waitlist`, `/v1/events`, rater-token endpoints.

- May import: `core`, `kb`, `llm`, `db`. Wiring of adapters happens here, per app.
- Layering: `src/modules/<feature>/{routes,service,types}.ts`. routes -> services -> core -> ports -> adapters. **Routes never touch the database.**
- Lifecycle per request: request id header + logs -> Zod validation (400 problem-details on failure) -> service -> stable response. Errors are problem-details. Logs are structured JSON; no bodies.
- Config from env, validated at start-up; a missing required variable stops the process. `GET /healthz`, `GET /readyz` (database, active KB release).
- Rate limiter is in-house, token-bucket, **single-instance only** (see its ADR). Strict CSP, no raw HTML, CORS locked to the app origin.
- Rater tokens only ever see their own assignments; store the hash only. Test cross-token attempts.
- `/v1/explain` is gated: only with `ALLOW_REAL_LLM` or the fake client.
- Test: contract snapshots, problem-details shape, rate limiter, rater isolation, integration on real Postgres.
