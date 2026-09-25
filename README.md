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

The Gateway calls `ms-auth-java` over HTTP (`MS_AUTH_URL`) and verifies its access tokens locally (shared `JWT_ACCESS_SECRET`). Shared TypeScript/Zod contracts live in `packages/contracts`. The legacy NestJS `services/ms-auth` is kept behind the `legacy` compose profile until its removal.

CI/CD: GitHub Actions, Docker images pushed to GHCR, atomic deploy on a single AWS EC2 instance.

## Run locally with Docker

**Requirements:** Docker, Docker Compose.

```bash
git clone <repo-url>
cd Event-app
```

Start `ms-auth-java` first, from its own repo: `docker compose --profile app up --build` (API on http://localhost:8080).

Create a `.env` at the repo root (DB credentials, `MS_AUTH_URL`, `JWT_ACCESS_SECRET` = ms-auth-java's `JWT_SECRET` - see `apps/gateway/.env.example`), and a `.env` in `apps/front` (see `apps/front/.env.example`).

```bash
docker compose up --build
```

This starts:

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Gateway API | http://localhost:3000 |
| phpMyAdmin (MySQL gateway DB) | http://localhost:8083 |
| Mongo Express (auth DB) | http://localhost:8084 |

Stop everything:

```bash
docker compose down
```

Wipe volumes (reset DB state):

```bash
docker compose down -v
```

## Stack

- **Backend:** NestJS, TypeScript, Prisma; auth in Java/Spring Boot (`ms-auth-java`)
- **Frontend:** React, TypeScript, TanStack Query, shadcn/ui
- **Infra:** Docker, GitHub Actions, AWS EC2

## Status

Active development. This repo (`event-app`) holds the stable NestJS/React stack currently deployed. Auth is being rewritten in Java/Spring Boot in a separate repo - see [`ms-auth-java`](https://github.com/help-platform-event/ms-auth-java).
