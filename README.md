# event-app

The user-facing part of the [H.E.L.P platform](https://github.com/help-platform-event): the React **Front** and the NestJS **Gateway** (public API). Organize events, break them down into missions and time slots, and let volunteers register for slots.

The platform overview (all services, architecture, Kafka topics) and the instructions to run the whole stack are on the [organization page](https://github.com/help-platform-event).

Staging: https://staging-mt-event-app.duckdns.org/ - frozen V1 prototype.

## Structure

Monorepo (pnpm + Turborepo):

| Path | Content |
|---|---|
| `apps/front` | React + TypeScript (Vite, TanStack Query, shadcn/ui) |
| `apps/gateway` | NestJS public API, port 3000 (Swagger at `/api`) |
| `packages/contracts` | Shared TypeScript types and Zod schemas (Front ↔ Gateway, Kafka payloads) |
| `packages/database` | Prisma schema, migrations and client (`@app/db`) |

## The Gateway

- **Business API**: events, missions, slots and participation (request, accept, reject, cancel), stored in MySQL through Prisma. A participation can be cancelled by the volunteer or by the event's organizer. `GET /me/participations` returns the user's participations with their slot, mission and event.
- **Auth delegated to [`ms-auth-java`](https://github.com/help-platform-event/ms-auth-java)**: signup, login, profile and settings calls are relayed over HTTP (`MS_AUTH_URL`). The access tokens it issues are verified locally, with the same secret (`JWT_ACCESS_SECRET`).
- **Kafka events**: after a participation request, decision or cancellation is committed, the Gateway publishes `event.participation.requested` (to notify the organizer), `event.participation.decided` (to notify the volunteer) or `event.participation.cancelled` (to notify the other party), keyed by the user to notify (`apps/gateway/src/kafka`). It creates these topics at startup: whoever publishes a topic declares it. The payload types are in `packages/contracts/src/events`.
  - It uses [kafkajs](https://kafka.js.org/). kafkajs is no longer maintained, but it's kept on purpose: it's pure JavaScript, simple, and has no known vulnerability. Its official successor, `@confluentinc/kafka-javascript`, has a compatible API if it ever needs replacing.
- **In-app notifications**: `/notifications` relays the bell's requests to `ms-notification-java` (`MS_NOTIFICATION_URL`), forwarding the user's token; anonymous requests get a 401 in the Gateway.
- **Geocoding**: event addresses are geocoded with Geoapify (`GEOAPIFY_API_KEY`).
- Both Java service clients share `src/utils/http/ServiceHttpClient`: a non-2xx `ProblemDetail` becomes an `HttpException` with its `detail`, and an unreachable service becomes a 503.

## The Front

- "Mes missions" (`/me/missions`): the user's participations grouped by event, with the slot and the status; a pending or accepted participation can be cancelled (after a confirmation).
- The notification bell (`features/notification`), in the logged-in layout's header: the unread badge is refreshed by **polling** (React Query, every 30 s, paused while the tab is hidden), and the menu lists the latest notifications.

## Develop

The simplest way to run everything is `pnpm stack:up` (see the [organization page](https://github.com/help-platform-event)).

To work on the Front or the Gateway with hot reload, start the stack, stop its `dev-gateway` and/or `dev-frontend` containers, then:

```bash
pnpm install
pnpm dev          # turbo: Front (5173) + Gateway (3000) in watch mode
```

Variables: `apps/gateway/.env.example` (database, `MS_AUTH_URL`, `MS_NOTIFICATION_URL`, `KAFKA_BROKERS`, JWT, Geoapify) and `apps/front/.env.example` (`VITE_API_URL`, Google client id, Geoapify key).

## Tests and quality

```bash
pnpm --filter gateway test    # Jest unit tests
pnpm typecheck                # ESLint on every app
```
