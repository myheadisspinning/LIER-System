# Barangay Culiat Safety Portal

Law Enforcement and Incident Reporting System — AI-Assisted Dispatch, Case Tracking, and Evidence Management.

## Structure

```
.
├── frontend/     React + Vite + Tailwind web app (SPA)
├── backend/      Reserved for future server / API code (Supabase is the live backend)
├── database/     SQL schema, seeds, and admin account scripts (run in Supabase SQL Editor)
├── prototypes/   Standalone HTML design prototypes (not part of the app)
├── docs/         Project documentation
└── .github/      CI workflows
```

## Getting started

```bash
cd frontend
npm ci
npm run dev      # start dev server
```

Build for production:

```bash
cd frontend
npm run build
npm run preview
```

## Environment

`frontend/.env` holds the Supabase credentials used by `frontend/src/supabaseClient.ts`:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

See `frontend/.env.example`.

## Database

SQL scripts in `database/` are meant to be run in the Supabase SQL Editor:

- `seed.sql` — `public_users` profile/role table, RLS policies, and the new-signup trigger.
- `create-accounts.sql` — creates `admin@culiat.ph` and `superadmin@culiat.ph` accounts and links their roles.

## Tests

Playwright E2E tests live in `frontend/tests/` and run from the `frontend/` folder:

```bash
cd frontend
npx playwright test
```

CI runs them via `.github/workflows/playwright.yml`.
