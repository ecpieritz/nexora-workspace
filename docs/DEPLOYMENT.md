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

## Vercel frontend

The existing Vercel project builds the Angular SPA only. A fullstack deployment requires the Express API and PostgreSQL to run on infrastructure that supports a persistent Node.js service and database. When keeping the frontend on Vercel, route `/api` to that API at the platform or edge-proxy layer and include both Vercel domains in `CORS_ORIGINS`.

The Docker topology avoids cross-origin configuration because Nginx serves the frontend and API from one origin.

## Release checks

GitHub Actions runs three gates:

1. formatting, linting, Prisma validation and unit/component tests;
2. committed migrations and API integration tests against PostgreSQL 17;
3. Angular/Express builds and both production Docker image targets.

The release is ready only after all three jobs pass.
