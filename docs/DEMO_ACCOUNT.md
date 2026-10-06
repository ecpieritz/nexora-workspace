# Nexora demo account

The database seed provisions a reusable portfolio account with representative data for every main Nexora workflow.

## Credentials

| Field     | Value                 |
| --------- | --------------------- |
| Email     | `demo@nexora.app`     |
| Password  | `Nexora123!`          |
| Role      | Workspace owner       |
| Workspace | Nexora Demo Workspace |

These credentials are intentionally public and must only be used for the portfolio demo environment. Do not reuse the password for a real account or production system.

## Seeded workspace

Running `npm run db:seed` upserts the demo account and its workspace with:

- six workspace members with owner, administrator, and member roles;
- eight customer profiles and their performance indicators;
- five products with inventory and pricing data;
- ten invoices across complete, pending, and cancelled states;
- six assigned tasks across to-do, doing, and done states;
- eight schedule and calendar entries.

Invoice dates are placed immediately before the seed execution date, while task and schedule dates use the current month. This keeps dashboard reports and calendar screens populated when the seed is applied to a fresh environment. Re-running the seed refreshes the demo records and documented password without deleting accounts created through public registration.

## Local setup

```bash
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev:api
npm run dev:web
```

Open `http://localhost:4200/auth/login` and use the credentials above.

## Deployed environments

Apply migrations and run the seed once against the database configured for the target environment:

```bash
npm run db:deploy
npm run db:seed
```

Preview and production should use separate PostgreSQL databases. Confirm the active `DATABASE_URL` before running either command. The seed is idempotent, but it intentionally restores the demo account password and representative records.

## Testing from a clean account

Registration remains available at `/auth/sign-up`. A newly registered user receives a separate personal workspace and does not inherit any demo customers, products, invoices, tasks, or events. This allows visitors to choose between exploring populated screens and testing the complete onboarding flow from an empty account.
