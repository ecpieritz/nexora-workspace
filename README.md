# Nexora Workspace

Nexora is a responsive business workspace built with Angular 19. It brings dashboards, invoices, schedules, tasks, calendars, customers and product analytics into a polished portfolio application backed by a local mock API.

## Highlights

- Standalone components, signals, strict TypeScript and lazy-loaded routes.
- Responsive dashboard based on the supplied Figma screens.
- Authentication and guarded workspace routes.
- Invoice, schedule, task, calendar, customer and product workflows.
- Mock latency and browser persistence without an external backend.
- Accessible keyboard navigation, feedback states, toasts and confirmation dialogs.
- Unit and component tests plus automated CI checks.

## Stack

Angular 19, TypeScript, RxJS, SCSS, Jasmine, Karma, ESLint and Prettier.

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
npm run lint       # static analysis
npm test           # interactive unit tests
npm run test:ci    # headless tests with coverage
npm run build      # optimized production build
npm run validate   # complete local quality gate
```

## Architecture and screenshots

See [architecture](docs/ARCHITECTURE.md) and the [screenshot guide](docs/SCREENSHOTS.md).

## Mock data notice

This is a frontend portfolio project. It does not send data to a remote server and must not be used for sensitive or production information. Clear the site data in your browser to reset the demo.

## Release

Current portfolio release: **v1.0.0**.
