# kb-check

`pnpm kb:check` runs the release checks on `kb/` (release mode) and on `kb/fixtures` (fixture mode). A failing check exits 1.
`pnpm kb:sweep` lists records that are due within the review window or expired, and changes nothing.

Release mode (the real tree): schema; no placeholders (`<...>`, `__FOUNDER_TO_SET__`, TODO) and no expired record for a launch decision type; every `source.quote` appears verbatim in `kb/snapshots/<id>.txt` and the snapshot is of the same URL; `valid_until` equals `last_verified` plus the TTL for the record's type; references resolve; fixture-looking sources (`*.example`) are rejected. Fixture mode skips the data checks (the data is fake) and keeps the structural ones. Only `decision-types/`, `options/`, `records/`, `proposals/` and `snapshots/` are ever read: `kb/fixtures` and `kb/schema` never enter a release.
