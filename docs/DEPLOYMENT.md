# Fullstack deployment

Nexora ships production targets for the Angular application, Express API and PostgreSQL. The root `Dockerfile` is multi-stage so CI and deployments can build the `web`, `api` and `api-migrate` targets independently.

## Runtime topology

- `web`: Nginx serves the compiled Angular SPA on port `8080` and proxies `/api` to Express.
- `api`: Node.js runs the compiled Express application as an unprivileged user on port `3000`.
- `migrate`: a one-shot container applies committed Prisma migrations before the API starts.
- `postgres`: PostgreSQL 17 stores application data in a persistent named volume and is not exposed publicly.

Only the web container publishes a host port. The API and database communicate on an internal Docker network. Both HTTP services expose health checks, and Compose waits for migrations and dependencies before marking the stack ready.

## Production Compose

Create the private production environment file and replace every placeholder:

```bash
cp .env.production.example .env.production
```

`POSTGRES_PASSWORD`, `DATABASE_URL` and `JWT_ACCESS_SECRET` are mandatory. If the database password contains reserved URL characters, URL-encode it inside `DATABASE_URL`.

Validate and start the stack:

```bash
npm run prod:config
npm run prod:up
```

Open `http://localhost:8080` and verify `http://localhost:8080/api/health`. Useful lifecycle commands:

```bash
npm run prod:logs
npm run prod:down
npm run prod:build
```

`prod:down` preserves the PostgreSQL volume. Removing the named volume deletes production data and is intentionally not part of the npm scripts.

## Demo data

Production startup applies migrations but does not seed data automatically. This avoids resetting the documented demo credentials on every deployment. Seed explicitly when the target environment should expose the portfolio account:

```bash
docker compose --env-file .env.production -f compose.production.yaml run --rm migrate npm run prisma:seed --workspace=@nexora/api
```

Public registration remains enabled whether or not the demo seed is installed.

## Vercel fullstack deployment

The root `api/index.ts` file exports the same Express application as a Vercel Function. A prioritized rewrite sends `/api/*` to the function with an internal path parameter; the adapter restores the original `/api` URL before Express routing, while application routes continue to fall back to `index.html`. The serverless entry point intentionally does not call `listen()` or disconnect Prisma after each request.

Configure at least these values independently for Preview and Production:

```text
DATABASE_URL
DIRECT_DATABASE_URL (when the provider offers a direct connection)
JWT_ACCESS_SECRET
CORS_ORIGINS
PASSWORD_RESET_URL
```

Use a managed PostgreSQL connection string suitable for serverless workloads. `DATABASE_URL` is the pooled runtime connection; when the provider exposes a separate direct connection, set `DIRECT_DATABASE_URL` for Prisma migrations and seed operations. Preview and Production should never share a database or JWT secret. After configuring the environment, apply migrations and seed from a trusted terminal using the corresponding connection values:

```bash
npm run db:deploy
npm run db:seed
```

The demo account does not exist until the seed succeeds against that exact database. Verify the deployment at `/api/health` before attempting login; a healthy API returns JSON rather than the Angular HTML document.

The Docker topology remains available for a long-running deployment and avoids cross-origin configuration because Nginx serves the frontend and API from one origin.

## Release checks

GitHub Actions runs three gates:

1. formatting, linting, Prisma validation and unit/component tests;
2. committed migrations and API integration tests against PostgreSQL 17;
3. Angular/Express builds and both production Docker image targets.

The release is ready only after all three jobs pass.
