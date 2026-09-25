# H.E.L.P - Hub for Event Logistic & People

Event and volunteer management platform. Organize events, break them down into missions and time slots, manage user availability, and let people register for slots.

Part of the [H.E.L.P organization](https://github.com/help-platform-event) - see also [`ms-auth-java`](https://github.com/help-platform-event/ms-auth-java), a Java/Spring Boot rewrite of the auth service (private, local dev).

Staging: https://staging-mt-event-app.duckdns.org/ - this staging instance is a V1 prototype and won't evolve further, due to the constraints of the current AWS server.

## Architecture

Monorepo (pnpm + Turborepo). Auth is served by [`ms-auth-java`](https://github.com/help-platform-event/ms-auth-java) (Java/Spring Boot, separate repo), which the Gateway calls over HTTP:

| Service | Role | Database | Port |
|---|---|---|---|
| `gateway` | Public API, business logic (events, missions, slots, participation) | MySQL (Prisma) | 3000 |
| `ms-auth-java` (separate repo) | Auth, users, settings (JWT, refresh tokens, Google OAuth) | MySQL (JPA/Flyway) | 8080 |
| `frontend` | React + TypeScript SPA | - | 5173 |

The Gateway calls `ms-auth-java` over HTTP (`MS_AUTH_URL`) and verifies its access tokens locally (shared `JWT_ACCESS_SECRET`). Shared TypeScript/Zod contracts live in `packages/contracts`.

CI: GitHub Actions quality checks on pull requests. The AWS V1 release pipeline (`release.yml`, `infra/docker/docker-compose.{staging,prod}.yml`) is frozen: manual trigger only, kept as an archive until the new deployment.

## Run locally with Docker (full stack, one command)

**Requirements:** Docker, Docker Compose, and [`ms-auth-java`](https://github.com/help-platform-event/ms-auth-java) cloned **next to** this repo (`../ms-auth-java`): `docker-compose.dev.yml` includes its `compose.yaml`.

Create a `.env` at the repo root (see `apps/gateway/.env.example`; DB host/credentials, `MS_AUTH_URL` and the JWT settings are already set by the compose file). Add `VITE_GOOGLE_CLIENT_ID` and `VITE_GEOAPIFY_API_KEY` to that root `.env` too: they are passed to the Front as build args.

From the root of this repo:

```bash
pnpm stack:up      # build + start everything (detached); Gateway migrations are applied automatically
pnpm stack:ps      # status
pnpm stack:logs    # follow logs
pnpm stack:down    # stop
pnpm stack:reset   # stop and wipe volumes (fresh databases)
```

These wrap `docker compose -f docker-compose.dev.yml --profile app ...` (`--profile app` starts the ms-auth-java container, which that repo keeps behind a profile). The one-shot `db-migrate` service runs `prisma migrate deploy` before the Gateway starts.

This starts:

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Gateway API | http://localhost:3000 |
| ms-auth-java API | http://localhost:8080 |
| phpMyAdmin (Gateway DB) | http://localhost:8083 |
| Adminer (auth DB, server `mysql`) | http://localhost:8081 |
| Kafka (host clients) | localhost:9094 |

### Host mode (Gateway/Front with hot reload)

`infra/docker/docker-compose.yml` starts only the Gateway's MySQL (3308) and phpMyAdmin. Run ms-auth-java from its repo (`./mvnw spring-boot:run`), then `pnpm dev` here, with `apps/gateway/.env` pointing at `localhost:3308` and `MS_AUTH_URL=http://localhost:8080`. Apply the Gateway migrations yourself in this mode: `DATABASE_URL="mysql://root:root@localhost:3308/help" pnpm --filter @app/db db:deploy`.

## Stack

- **Backend:** NestJS, TypeScript, Prisma; auth in Java/Spring Boot (`ms-auth-java`)
- **Frontend:** React, TypeScript, TanStack Query, shadcn/ui
- **Infra:** Docker, GitHub Actions, AWS EC2

## Status

Active development. Auth has moved to Java/Spring Boot ([`ms-auth-java`](https://github.com/help-platform-event/ms-auth-java)); the staging instance still runs the frozen V1.
