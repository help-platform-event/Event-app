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
| `ms-notification-java` (separate repo, in progress) | Notifications: consumes Kafka events, sends emails (in-app next) | MySQL (JPA/Flyway) | 8085 |
| `frontend` | React + TypeScript | - | 5173 |

The Gateway calls `ms-auth-java` over HTTP (`MS_AUTH_URL`) and verifies its access tokens locally (shared `JWT_ACCESS_SECRET`). Shared TypeScript/Zod contracts live in `packages/contracts`.

Services also talk through **Kafka**, fire-and-forget: each publishes what happened, and `ms-notification-java` consumes it to send notifications, without the services ever calling each other.

- `ms-auth-java` publishes `auth.*` topics: registration, settings changes, password changes...
- The Gateway publishes `event.participation.requested` (a volunteer asks to join a slot: the organizer is notified) and `event.participation.decided` (the organizer accepts or rejects: the volunteer is notified). It publishes with [kafkajs](https://kafka.js.org/) (`apps/gateway/src/kafka`), after the database transaction commits, keyed by the user to notify. It also creates these two topics at startup: whoever publishes a topic declares it. kafkajs is no longer maintained, but it's kept on purpose: it's pure JavaScript, simple, and has no known vulnerability. Its official successor, `@confluentinc/kafka-javascript`, has a compatible API if it ever needs replacing. The payload types are in `packages/contracts/src/events`.
- `ms-notification-java` only notifies a user if their notification settings allow it (e.g. "event activity" turned on).

**CI**: GitHub Actions quality checks on pull requests. The AWS V1 release pipeline (`release.yml`, `infra/docker/docker-compose.{staging,prod}.yml`) is frozen: manual trigger only, kept as an archive until the new deployment.

## Run locally with Docker (full stack, one command)

**Requirements:** Docker, Docker Compose, and both [`ms-auth-java`](https://github.com/help-platform-event/ms-auth-java) and `ms-notification-java` cloned next to this repo (`../ms-auth-java`, `../ms-notification-java`): `docker-compose.dev.yml` includes their `compose.yaml`.

Create a `.env` at the repo root (see `apps/gateway/.env.example`, DB host/credentials, `MS_AUTH_URL`, `KAFKA_BROKERS` and the JWT settings are already set by the compose file). Add `VITE_GOOGLE_CLIENT_ID` and `VITE_GEOAPIFY_API_KEY` to that root `.env` too: they are passed to the Front as build args.

From the root of this repo:

```bash
pnpm stack:up      # build + start everything
pnpm stack:ps      # status
pnpm stack:logs    # follow logs
pnpm stack:down    # stop
pnpm stack:reset   # stop and wipe volumes (fresh databases)
```

These wrap `docker compose -f docker-compose.dev.yml --profile app ...` (`--profile app` starts the ms-auth-java and ms-notification-java containers, which those repos keep behind a profile).

This starts:

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Gateway API | http://localhost:3000 |
| ms-auth-java API | http://localhost:8080 |
| phpMyAdmin (Gateway DB) | http://localhost:8083 |
| Adminer (auth DB, server `mysql`) | http://localhost:8081 |
| ms-notification-java | http://localhost:8085/actuator/health |
| Mailpit (every email sent) | http://localhost:8025 |
| Kafka UI (topics, messages, consumer groups) | http://localhost:8082 |
| Kafka (host clients) | localhost:9094 |

## Stack

- **Backend:** NestJS, TypeScript, Prisma, Java/Spring Boot
- **Messaging:** Kafka (kafkajs in the Gateway, Spring Kafka in the Java services)
- **Frontend:** React, TypeScript, TanStack Query, shadcn/ui
- **Infra:** Docker, GitHub Actions, AWS EC2

## Status

Active development. Auth has moved to Java/Spring Boot ([`ms-auth-java`](https://github.com/help-platform-event/ms-auth-java)). The Java notification service (`ms-notification-java`) already sends emails (account, security, participation requests and decisions); in-app notifications (a bell in the Front) are next. The staging instance still runs the frozen V1.
