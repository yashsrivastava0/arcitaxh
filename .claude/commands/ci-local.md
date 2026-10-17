---
description: Run the CI stages locally, in CI order
---

Run `pnpm ci` and report each stage's result. If `pnpm ci` does not exist yet, run the stages that do exist, in this order: frozen-lockfile install, typecheck, lint, `check:boundaries`, core unit tests, property and golden tests, parity, `kb:check`, integration tests (needs Postgres: `infra/docker-compose.yml`; this machine is low on RAM, so start it only for this stage and do not restart Docker), `licences:check` and audit, `docs:check`, build.

Show the first failure with its output and stop there. Do not mark a stage green that did not run.
