# Nexora Workspace

Nexora is a responsive business workspace being evolved into a fullstack application. Its Angular 19 frontend brings dashboards, invoices, schedules, tasks, calendars, customers and product analytics into a polished portfolio experience, while its Node.js and Express API provides the backend foundation.

## Highlights

- Standalone components, signals, strict TypeScript and lazy-loaded routes.
- Responsive dashboard based on the supplied Figma screens.
- Authentication and guarded workspace routes.
- Invoice, schedule, task, calendar, customer and product workflows.
- Mock latency and browser persistence without an external backend.
- Accessible keyboard navigation, feedback states, toasts and confirmation dialogs.
- Unit and component tests plus automated CI checks.

## Stack

Angular 19, Node.js, Express, TypeScript, RxJS, SCSS, Jasmine, Karma, ESLint and Prettier.

## Design credits

The interface was implemented from the community Figma design [SAAS Dashboard Community](https://www.figma.com/design/tJ4bHE2CNR3ZMCr0SIH9oq/SAAS-Dashboard--Community-?node-id=0-1&t=5pyV7t5r3Wt4Hfc4-0), adapted and expanded for the Nexora portfolio project.

## Getting started

Requires Node.js 20+ and npm.

```bash
npm ci
npm start
```

Open `http://localhost:4200`. Create a demo account from the sign-up page; its data and subsequent records are stored only in your browser.

## Commands

```bash
npm start          # development server
npm run dev:api    # API development server
npm run lint       # static analysis
npm test           # interactive unit tests
npm run test:ci    # headless tests with coverage
npm run build      # optimized production build
npm run validate   # complete local quality gate
```

## Workspace structure

```text
apps/
├── api/            # Node.js and Express API
└── web/            # Angular application
docs/               # Architecture and visual documentation
```

The repository uses npm workspaces. Root scripts orchestrate the applications, so the existing development and CI commands remain unchanged as the backend is introduced.

## Architecture and screenshots

See [architecture](docs/ARCHITECTURE.md) and the [screenshot guide](docs/SCREENSHOTS.md).

## Mock data notice

The Angular features still use local mock repositories while the backend is introduced incrementally. The API currently exposes its initial health endpoint and must not yet be used for sensitive or production information.

## Release

Current portfolio release: **v1.0.0**.

The production frontend is deployed on Vercel at [nexora-workspace-delta.vercel.app](https://nexora-workspace-delta.vercel.app/). Root-level Vercel configuration keeps the Angular SPA deployable while backend capabilities are added incrementally.
