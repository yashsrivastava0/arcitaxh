# Phases

Phase 0 (validate the engine) is the only active phase. Canvas work starts only after the Phase 0 gate passes, or when the founder asks in writing.

## Growth plan

Where later additions go, so nothing needs restructuring:

| Later addition | Goes in |
|---|---|
| Canvas, drawer, numbers strip (Phase 1-2) | `apps/web/src/features/canvas/…`, `…/drawer/…` |
| Better Auth, designs, versions | `apps/api/src/modules/{auth,designs}` + `packages/db` migrations |
| Credit ledger, MoR webhooks | `apps/api/src/modules/billing`, `packages/db` |
| Debate streaming (SSE), jobs | `apps/api/src/modules/debates`, `apps/worker/src/jobs/*` |
| Exports, alerts, MCP | `apps/api/src/modules/{exports,alerts,mcp}` |
| GitHub App (Phase 3) | `apps/api/src/modules/github` |
| New domains beyond AI apps | new `kb/` decision-type folders; no code restructure |

Inside each app use `src/modules/<feature>/{routes,service,types}.ts` (api) and `src/features/<feature>/` (web). Routes never touch the database directly (layering: routes, services, core, ports, adapters).

## Folders

- [`phase-0/`](./phase-0/README.md): plan, status (handoff), conflicts, parking lot, questions, spec change proposals.
- `phase-1/`, `phase-2/`, `phase-3/`: placeholders.
