# kb-build

`pnpm kb:build --dev` builds `dist/kb/kb-dev.json` (local, non-releasable). `pnpm kb:build --version kb-YYYY.MM.N` builds a release and first requires a `## kb-YYYY.MM.N` heading in `kb/CHANGELOG.md`. Both refuse to run if the release checks fail, and refuse any path inside a `fixtures` folder. The output is deterministic (sorted, validated against the bundle schema).

`pnpm kb:schema` writes `kb/schema/*.json` from the Zod schemas; `pnpm kb:schema:check` (CI) fails if they were hand-edited or are stale.
