# tools/

Purpose: CLIs and scripts (`docs-index`, `kb-check`, `kb-build`, `kb-propose`, `phase0`, `licences`, `notices`). Each is a workspace package.

- May import any package. **No package or app may import anything from `tools/`.**
- File and network access is allowed here (unlike `packages/core`).
- Anything that calls a real model refuses to run without `ALLOW_REAL_LLM=1` and a configured spend cap, and refuses placeholder model ids.
- Commands are idempotent and print what they changed.
- Test the logic in a `lib.ts`; keep `cli.ts` thin.
