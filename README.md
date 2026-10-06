# Nexora Workspace

Nexora is a fullstack business workspace. Its Angular 19 frontend brings dashboards, invoices, schedules, tasks, calendars, customers and product analytics into a polished portfolio experience, while its Node.js and Express API persists workspace-scoped data in PostgreSQL through Prisma ORM.

## Highlights

- Standalone components, signals, strict TypeScript and lazy-loaded routes.
- Responsive dashboard based on the supplied Figma screens.
- Authentication and guarded workspace routes.
- Invoice, schedule, task, calendar, customer and product workflows.
- REST API persistence with workspace-scoped PostgreSQL data.
- Accessible keyboard navigation, feedback states, toasts and confirmation dialogs.
- Unit, integration and component tests plus automated CI checks.

## Stack

Angular 19, Node.js, Express, PostgreSQL, Prisma ORM, TypeScript, RxJS, SCSS, Jasmine, Karma, ESLint and Prettier.

## Design credits

The interface was implemented from the community Figma design [SAAS Dashboard Community](https://www.figma.com/design/tJ4bHE2CNR3ZMCr0SIH9oq/SAAS-Dashboard--Community-?node-id=0-1&t=5pyV7t5r3Wt4Hfc4-0), adapted and expanded for the Nexora portfolio project.

## Getting started

Requires Node.js 20.19+, npm, Docker Desktop or Docker Engine, and Docker Compose.

```bash
npm ci
cp .env.example .env
cp apps/api/.env.example apps/api/.env
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev:api
npm run dev:web
```

Open `http://localhost:4200`. The API is available at `http://localhost:3000/api`, and PostgreSQL is exposed locally on port `5432` by default. The Angular development server proxies `/api` requests to port `3000`. Authentication, customers, products, analytics, invoices, schedules, calendars, tasks, and dashboard reporting use the REST API.

## Demo account

Run `npm run db:seed` and sign in with the populated portfolio account:

| Field    | Value             |
| -------- | ----------------- |
| Email    | `demo@nexora.app` |
| Password | `Nexora123!`      |

The idempotent seed creates a workspace with team members, customers, products, invoices, tasks, and calendar entries. Time-sensitive records are positioned around the date on which the seed runs so the dashboard and calendar remain useful. See [the demo account guide](docs/DEMO_ACCOUNT.md) for the complete dataset and deployment instructions.

Public registration remains enabled. Visitors can use **Create account** to receive a separate personal workspace without the seeded portfolio records and test Nexora from a clean state.

The root `.env` configures the local PostgreSQL container. `apps/api/.env` configures the API and its `DATABASE_URL`. Both files are ignored by Git; only their `.env.example` templates are versioned. Run `npm run db:status` to confirm the database is healthy and `npm run db:logs` to inspect its logs.

## API documentation

With the API running locally, open [http://localhost:3000/api/docs](http://localhost:3000/api/docs) for the interactive Swagger UI. The OpenAPI 3.1 document is also available as JSON at [http://localhost:3000/api/openapi.json](http://localhost:3000/api/openapi.json). Use the Swagger `Authorize` action with an access token returned by `/api/auth/login` to try protected endpoints.

### Deployment environments

| Environment                  | Frontend URL                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| Development (Vercel Preview) | [dev-nexora-workspace-delta.vercel.app](https://dev-nexora-workspace-delta.vercel.app/) |
| Production                   | [nexora-workspace-delta.vercel.app](https://nexora-workspace-delta.vercel.app/)         |

The root `api/index.ts` adapter deploys the existing Express application as a Vercel Function alongside the Angular frontend. A prioritized rewrite forwards `/api/*` to that function and restores the complete Express route before the SPA fallback runs. Configure `DATABASE_URL`, `JWT_ACCESS_SECRET`, `CORS_ORIGINS` and `PASSWORD_RESET_URL` at minimum; the remaining API settings use the documented defaults. Preview and production must use separate databases and JWT secrets. Apply migrations and seed the target database before using the demo login. Do not commit private environment files; only example templates are versioned.

## Production containers

The multi-stage Docker build produces separate Express and Angular/Nginx images. Production Compose starts PostgreSQL, applies committed Prisma migrations in a one-shot container, waits for the API health check and then exposes the complete application through Nginx on port `8080`.

```bash
cp .env.production.example .env.production
# Replace every placeholder in .env.production.
npm run prod:config
npm run prod:up
```

Open `http://localhost:8080` and verify the API at `http://localhost:8080/api/health`. Production startup intentionally does not seed demo data. See the [fullstack deployment guide](docs/DEPLOYMENT.md) for topology, secrets, seeding and Vercel considerations.

## Commands

```bash
npm start          # development server
npm run dev:api    # API development server
npm run db:up      # start the local PostgreSQL container
npm run db:down    # stop the local PostgreSQL container
npm run db:status  # inspect local database health
npm run db:logs    # follow PostgreSQL logs
npm run db:generate # generate the type-safe Prisma Client
npm run db:validate # validate the Prisma schema and configuration
npm run db:seed     # upsert the portfolio demo data
npm run db:studio   # inspect local data with Prisma Studio
npm run db:migrate  # create and apply a development migration
npm run db:deploy   # apply pending migrations in a deployed environment
npm run db:test:up  # start the isolated integration-test database
npm run db:test:down # stop the integration-test database
npm run prod:config # validate the production Compose configuration
npm run prod:build  # build the production API and web images
npm run prod:up     # migrate and start the production stack
npm run prod:down   # stop the production stack and preserve database data
npm run prod:logs   # follow logs for the production stack
npm run lint       # static analysis
npm test           # interactive unit tests
npm run test:ci    # headless tests with coverage
npm run test:integration # run API integration tests against PostgreSQL
npm run build      # optimized production build
npm run validate   # complete local quality gate
```

## Workspace structure

```text
apps/
├── api/             # Node.js, Express and Prisma API
└── web/             # Angular application
docker/              # Production Nginx configuration
docs/                # Architecture, deployment and visual documentation
```

The repository uses npm workspaces. Root scripts orchestrate the applications, so the existing development and CI commands remain unchanged as the backend is introduced. Prisma Client is generated automatically during dependency installation and before API builds.

API integration tests exercise the real Express routes, JWT sessions, Prisma repositories and PostgreSQL schema. Run `npm run db:test:up` followed by `npm run test:integration`; the test runner only accepts a database name containing `test` and defaults to the isolated container at `localhost:5433/nexora_test`. GitHub Actions provisions its own temporary PostgreSQL service and applies migrations before the integration suite.

The initial migration creates the authentication, workspace membership, customer, product, invoice, task and schedule tables. After starting PostgreSQL for the first time, apply it locally with `npm run db:migrate`, then run `npm run db:seed`. The idempotent seed can be rerun to restore the portfolio account, reset its documented password and refresh its representative business dates without creating duplicates or removing independently registered accounts. Deployed environments use `npm run db:deploy` so existing migration files are applied without creating new ones; seed each environment explicitly when demo data is desired.

## Architecture and screenshots

See [architecture](docs/ARCHITECTURE.md), [deployment](docs/DEPLOYMENT.md) and the [screenshot guide](docs/SCREENSHOTS.md).

## Frontend data notice

Angular authentication, customer management, products, analytics, invoices, schedules, calendars, tasks, and dashboard reporting are connected to the REST API. Authentication uses persisted server-issued sessions and refresh-token rotation; business operations are scoped to the authenticated workspace, product reporting supports server-side date ranges, calendars load range-based events from `/api/calendar/events`, and the dashboard aggregates workspace metrics and reports from `/api/dashboard`. Collaborative task operations use `/api/tasks`, including status changes made from the list, board, and timeline views. User preferences remain local to the browser. Local password recovery links are printed by the API process; production delivery remains disabled until an email provider is configured.

## Release

Current fullstack portfolio release: **v2.0.0**.

The Angular frontend and serverless Express adapter are deployed together on Vercel at [nexora-workspace-delta.vercel.app](https://nexora-workspace-delta.vercel.app/). Vercel still requires a managed PostgreSQL database configured through `DATABASE_URL`; the provided Docker topology is the alternative for hosts that support long-running containers.
