# Backend

The live backend is currently **Supabase** (Auth, Postgres, RLS) — there is no custom server code yet.

This folder is reserved for future API / server code (e.g. Supabase Edge Functions, or a separate Node/Express service).

- Frontend talks to Supabase directly via `frontend/src/supabaseClient.ts`.
- Database schema/migrations live in the `database/` folder.
