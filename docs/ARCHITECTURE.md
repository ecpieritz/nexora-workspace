# Nexora architecture

Nexora is organized as a fullstack npm workspace. The Express API lives in `apps/api`, and the Angular application lives in `apps/web`. The frontend uses standalone components, strict TypeScript and feature-first folders. Routes load features lazily, while shared UI primitives live under `apps/web/src/app/shared/ui` and cross-cutting services under `apps/web/src/app/core`.

The API separates application creation from the HTTP server bootstrap. `app.ts` composes Express middleware and routes, while `server.ts` owns the network listener and graceful shutdown lifecycle.

Incoming API data is validated with Zod at the route boundary. The shared validation middleware parses `body`, `params` and `query` without mutating Express query objects, then exposes the typed result through `getValidatedRequest`. Validation failures flow through the centralized error middleware as safe `422 VALIDATION_ERROR` responses with field-level issue paths.

Authentication follows a route-service-repository boundary. Registration normalizes validated credentials, hashes passwords with bcrypt and persists the user, personal workspace and owner membership in one Prisma transaction. API responses use explicit public projections so password hashes never leave the persistence boundary.

Authenticated sessions use short-lived HS256 access tokens with issuer and audience verification. Refresh tokens are high-entropy opaque values: only their SHA-256 hashes are persisted, and every successful refresh atomically revokes the previous session before creating its replacement. Logout revokes the matching session, while shared Bearer middleware verifies access tokens and exposes a typed authentication principal to protected routes.

Protected requests also resolve the session and workspace membership from PostgreSQL. Revoked or expired sessions are rejected immediately, and the current database role replaces potentially stale role claims from the JWT. Composable authorization middleware restricts handlers by workspace role and verifies that route workspace identifiers match the authenticated workspace, preventing cross-tenant access.

Password recovery returns the same accepted response whether an email exists or not. Reset tokens are high-entropy opaque values stored only as SHA-256 hashes, expire after a configurable interval and can be consumed once. A successful reset updates the bcrypt password hash and revokes every refresh session for the user in one transaction. Token delivery is abstracted behind a notifier: development writes the reset link to the API console, while production delivery stays disabled until an email provider is connected.

Authenticated profile endpoints expose explicit public projections for the current user and workspace. Profile updates are allowlisted at the validation boundary, so identity and authorization fields such as email, username and role cannot be changed. CPF/CNPJ is normalized before persistence and becomes immutable after its first assignment; optimistic matching prevents concurrent requests from bypassing that rule.

Runtime configuration is centralized in `apps/api/src/config/environment.ts`. Environment values are parsed once during startup and exposed through an immutable, typed object. Invalid ports, API prefixes, environments or CORS origins stop the process before it accepts traffic.

Local infrastructure is defined in the root `compose.yaml`. It runs PostgreSQL 17 with a persistent named volume and a readiness healthcheck, plus an isolated in-memory profile for integration tests. Docker credentials and port mapping come from the root `.env`, while the API receives its PostgreSQL connection string through `apps/api/.env`.

Prisma ORM provides the typed persistence boundary. Its schema and migration history live in `apps/api/prisma`, while `prisma.config.ts` resolves the connection used by the CLI. The generated client is excluded from version control and recreated during installation and API builds. A single shared client in `src/database/prisma.ts` owns the PostgreSQL driver adapter, startup connectivity check and graceful disconnection.

The relational model is scoped by workspace. Memberships own authorization roles, while customers, products, invoices, tasks and schedule entries belong to one workspace. Explicit join tables represent task assignments and schedule attendance. Invoice items preserve billing snapshots and may optionally reference products, allowing historical invoices to survive product removal.

Customer management follows the same route-service-repository boundary. Reads are paginated, searchable and filtered inside PostgreSQL; every query includes the authenticated workspace identifier. Members may read customer data, while creation, editing and deletion require an owner or administrator role. Only profile fields are writable, leaving performance metrics under backend control.

Product management applies the same workspace and role boundaries, with validated inventory, pricing and catalog fields. Its analytics endpoint derives totals, monthly sales, invoice-status distribution and top-product ranking from completed invoice items over a bounded date range. This keeps reporting values tied to transactional records instead of storing duplicated counters.

Invoice, schedule and task modules follow the same route-service-repository separation. All persistence queries include the authenticated workspace identifier, mutations are role-protected, and calendar/dashboard projections are computed by the API rather than reconstructed from browser storage.

## Production topology

The root `Dockerfile` provides three release targets. `api` contains only the compiled Express runtime and production dependencies, `web` serves the optimized Angular output from Nginx, and `api-migrate` retains Prisma tooling for a one-shot migration job. The migration job must complete before the API starts; Nginx starts only after the API health check passes.

`compose.production.yaml` places PostgreSQL and Express on an internal network. Only Nginx publishes port `8080`, serving the SPA and proxying `/api` to Express so browser traffic stays on one origin. PostgreSQL data uses a persistent volume, while credentials and signing secrets are supplied at runtime through an ignored `.env.production` file.

Production seeding is explicit. Container startup applies migrations but never rewrites demo credentials or representative dates automatically. Operators opt into the idempotent seed only for environments intended to host the portfolio demo account.

Vercel uses `api/index.ts` as a thin serverless adapter around the same Express composition root. A rewrite forwards every `/api/*` request to this function, which restores the original route before handing control to Express. It omits the network listener and process shutdown hooks from `server.ts`; Vercel owns invocation lifecycle while the module-scoped Prisma client can be reused by warm function instances. PostgreSQL remains external and must be provisioned separately for Preview and Production.

## Data flow

Pages request typed data from feature repositories, which communicate with the Express REST API through Angular's `HttpClient`. The global API interceptor wraps the authentication interceptor so each logical request is counted once, even when an expired access token is refreshed and retried. A shared signal drives the application-level progress indicator, while the centralized error service converts API, connectivity and server failures into safe toast messages. Request context tokens allow individual calls to opt out when a feature needs fully custom feedback. Signals hold local view state, and computed signals derive filters and selections.

## Main areas

- `core`: authentication, guards, HTTP activity and error handling, interceptors and layout.
- `features`: authentication, dashboard, invoices, schedules, tasks, calendar, customers and products.
- `shared`: branded and reusable UI foundations, notifications and dialogs.
- `styles`: tokens and feature-level responsive layouts.

## Quality strategy

The project uses ESLint, Prettier, strict Angular template checks, Node's test runner, Supertest, Jasmine/Karma tests and production bundle budgets. GitHub Actions separates static/unit quality checks, real PostgreSQL migration and API integration coverage, and fullstack plus production-container builds. A failure in any gate prevents the final build job from succeeding.
