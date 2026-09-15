# Nexora architecture

Nexora is organized as a fullstack npm workspace. The Express API lives in `apps/api`, and the Angular application lives in `apps/web`. The frontend uses standalone components, strict TypeScript and feature-first folders. Routes load features lazily, while shared UI primitives live under `apps/web/src/app/shared/ui` and cross-cutting services under `apps/web/src/app/core`.

The API separates application creation from the HTTP server bootstrap. `app.ts` composes Express middleware and routes, while `server.ts` owns the network listener and graceful shutdown lifecycle.

Incoming API data is validated with Zod at the route boundary. The shared validation middleware parses `body`, `params` and `query` without mutating Express query objects, then exposes the typed result through `getValidatedRequest`. Validation failures flow through the centralized error middleware as safe `422 VALIDATION_ERROR` responses with field-level issue paths.

Authentication follows a route-service-repository boundary. Registration normalizes validated credentials, hashes passwords with bcrypt and persists the user, personal workspace and owner membership in one Prisma transaction. API responses use explicit public projections so password hashes never leave the persistence boundary.

Authenticated sessions use short-lived HS256 access tokens with issuer and audience verification. Refresh tokens are high-entropy opaque values: only their SHA-256 hashes are persisted, and every successful refresh atomically revokes the previous session before creating its replacement. Logout revokes the matching session, while shared Bearer middleware verifies access tokens and exposes a typed authentication principal to protected routes.

Password recovery returns the same accepted response whether an email exists or not. Reset tokens are high-entropy opaque values stored only as SHA-256 hashes, expire after a configurable interval and can be consumed once. A successful reset updates the bcrypt password hash and revokes every refresh session for the user in one transaction. Token delivery is abstracted behind a notifier: development writes the reset link to the API console, while production delivery stays disabled until an email provider is connected.

Authenticated profile endpoints expose explicit public projections for the current user and workspace. Profile updates are allowlisted at the validation boundary, so identity and authorization fields such as email, username and role cannot be changed. CPF/CNPJ is normalized before persistence and becomes immutable after its first assignment; optimistic matching prevents concurrent requests from bypassing that rule.

Runtime configuration is centralized in `apps/api/src/config/environment.ts`. Environment values are parsed once during startup and exposed through an immutable, typed object. Invalid ports, API prefixes, environments or CORS origins stop the process before it accepts traffic.

Local infrastructure is defined in the root `compose.yaml`. It runs PostgreSQL 17 with a persistent named volume and a readiness healthcheck. Docker credentials and port mapping come from the root `.env`, while the API receives its PostgreSQL connection string through `apps/api/.env`. Database schemas and migrations will be introduced with the persistence layer.

Prisma ORM provides the typed persistence boundary. Its schema and migration history live in `apps/api/prisma`, while `prisma.config.ts` resolves the connection used by the CLI. The generated client is excluded from version control and recreated during installation and API builds. A single shared client in `src/database/prisma.ts` owns the PostgreSQL driver adapter, startup connectivity check and graceful disconnection.

The relational model is scoped by workspace. Memberships own authorization roles, while customers, products, invoices, tasks and schedule entries belong to one workspace. Explicit join tables represent task assignments and schedule attendance. Invoice items preserve billing snapshots and may optionally reference products, allowing historical invoices to survive product removal.

## Data flow

Pages request typed data from feature repositories. Repositories simulate latency through `MockApiService` and persist user-created records with `MockStorageService` in browser local storage. Signals hold view state; computed signals derive filters and selections.

## Main areas

- `core`: authentication, guards, interceptors, layout and mock API infrastructure.
- `features`: authentication, dashboard, invoices, schedules, tasks, calendar, customers and products.
- `shared`: branded and reusable UI foundations, notifications and dialogs.
- `styles`: tokens and feature-level responsive layouts.

## Quality strategy

The project uses ESLint, Prettier, strict Angular template checks, Jasmine/Karma tests, production bundle budgets and a GitHub Actions quality gate.
