# Nexora architecture

Nexora is organized as a fullstack npm workspace. The Express API lives in `apps/api`, and the Angular application lives in `apps/web`. The frontend uses standalone components, strict TypeScript and feature-first folders. Routes load features lazily, while shared UI primitives live under `apps/web/src/app/shared/ui` and cross-cutting services under `apps/web/src/app/core`.

The API separates application creation from the HTTP server bootstrap. `app.ts` composes Express middleware and routes, while `server.ts` owns the network listener and graceful shutdown lifecycle.

Runtime configuration is centralized in `apps/api/src/config/environment.ts`. Environment values are parsed once during startup and exposed through an immutable, typed object. Invalid ports, API prefixes, environments or CORS origins stop the process before it accepts traffic.

## Data flow

Pages request typed data from feature repositories. Repositories simulate latency through `MockApiService` and persist user-created records with `MockStorageService` in browser local storage. Signals hold view state; computed signals derive filters and selections.

## Main areas

- `core`: authentication, guards, interceptors, layout and mock API infrastructure.
- `features`: authentication, dashboard, invoices, schedules, tasks, calendar, customers and products.
- `shared`: branded and reusable UI foundations, notifications and dialogs.
- `styles`: tokens and feature-level responsive layouts.

## Quality strategy

The project uses ESLint, Prettier, strict Angular template checks, Jasmine/Karma tests, production bundle budgets and a GitHub Actions quality gate.
