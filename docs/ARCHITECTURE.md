# Nexora architecture

Nexora uses Angular standalone components, strict TypeScript and feature-first folders. Routes load features lazily, while shared UI primitives live under `src/app/shared/ui` and cross-cutting services under `src/app/core`.

## Data flow

Pages request typed data from feature repositories. Repositories simulate latency through `MockApiService` and persist user-created records with `MockStorageService` in browser local storage. Signals hold view state; computed signals derive filters and selections.

## Main areas

- `core`: authentication, guards, interceptors, layout and mock API infrastructure.
- `features`: authentication, dashboard, invoices, schedules, tasks, calendar, customers and products.
- `shared`: branded and reusable UI foundations, notifications and dialogs.
- `styles`: tokens and feature-level responsive layouts.

## Quality strategy

The project uses ESLint, Prettier, strict Angular template checks, Jasmine/Karma tests, production bundle budgets and a GitHub Actions quality gate.
