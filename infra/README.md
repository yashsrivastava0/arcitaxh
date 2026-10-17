# Infrastructure

Hosting is **Open** (ADR-029: chosen by a one-week streaming test in Phase 1). Deploy files come later. Nothing here deploys anything.

## Local PostgreSQL

`docker-compose.yml` runs PostgreSQL 18 with a direct connection, for development and the integration tests. It reads `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` (and optionally `POSTGRES_PORT`, default 5433) from `../.env`; the names are in `.env.example`, the values are yours and are never committed.

```bash
docker compose --env-file ../.env -f docker-compose.yml up -d     # start
docker compose --env-file ../.env -f docker-compose.yml down      # stop, keep data
docker compose --env-file ../.env -f docker-compose.yml down -v   # stop and delete data
```

Then set `DATABASE_URL` and `DATABASE_DIRECT_URL` in `.env` to `postgres://USER:PASSWORD@127.0.0.1:5433/DB` and run `pnpm db:migrate` (from milestone M8).

Notes:
- The image is capped at 512 MB. This machine runs out of RAM easily; start the container only for the stages that need it, and do not restart Docker if other containers are running.
- Host port 5433 avoids clashing with another PostgreSQL on 5432.
- CI uses a service container, not this file.
