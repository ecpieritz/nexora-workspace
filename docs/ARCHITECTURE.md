# Nexora architecture

Nexora is organized as a fullstack npm workspace. The Express API lives in `apps/api`, and the Angular application lives in `apps/web`. The frontend uses standalone components, strict TypeScript and feature-first folders. Routes load features lazily, while shared UI primitives live under `apps/web/src/app/shared/ui` and cross-cutting services under `apps/web/src/app/core`.

The API separates application creation from the HTTP server bootstrap. `app.ts` composes Express middleware and routes, while `server.ts` owns the network listener and graceful shutdown lifecycle.

Runtime configuration is centralized in `apps/api/src/config/environment.ts`. Environment values are parsed once during startup and exposed through an immutable, typed object. Invalid ports, API prefixes, environments or CORS origins stop the process before it accepts traffic.

Local infrastructure is defined in the root `compose.yaml`. It runs PostgreSQL 17 with a persistent named volume and a readiness healthcheck. Docker credentials and port mapping come from the root `.env`, while the API receives its PostgreSQL connection string through `apps/api/.env`. Database schemas and migrations will be introduced with the persistence layer.

Prisma ORM provides the typed persistence boundary. Its schema and migration history live in `apps/api/prisma`, while `prisma.config.ts` resolves the connection used by the CLI. The generated client is excluded from version control and recreated during installation and API builds. A single shared client in `src/database/prisma.ts` owns the PostgreSQL driver adapter, startup connectivity check and graceful disconnection.

## Data flow

Pages request typed data from feature repositories. Repositories simulate latency through `MockApiService` and persist user-created records with `MockStorageService` in browser local storage. Signals hold view state; computed signals derive filters and selections.

## Main areas

- `core`: authentication, guards, interceptors, layout and mock API infrastructure.
- `features`: authentication, dashboard, invoices, schedules, tasks, calendar, customers and products.
- `shared`: branded and reusable UI foundations, notifications and dialogs.
- `styles`: tokens and feature-level responsive layouts.

## Quality strategy

The project uses ESLint, Prettier, strict Angular template checks, Jasmine/Karma tests, production bundle budgets and a GitHub Actions quality gate.
