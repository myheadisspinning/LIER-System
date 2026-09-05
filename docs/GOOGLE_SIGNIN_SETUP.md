# Google Sign-In Branding Setup ("continue to fuphuqkxibmqermtcjoe.supabase.co" → "Barangay Culiat Safety")

## Why the Supabase domain shows on Google

When signing in with Google, the account chooser / consent screen shows the name of the
**OAuth client** that performed the request. If the Supabase project uses Supabase's
built-in (shared) Google provider without custom credentials, Google only knows the
Supabase project domain, so it displays `fuphuqkxibmqermtcjoe.supabase.co`.

This cannot be changed in the app code — the name comes from Google Cloud's OAuth
consent screen configuration. Fix it by creating your own Google OAuth client branded
as **Barangay Culiat Safety** and registering it in Supabase.

## Step 1 — Google Cloud Console

1. Go to <https://console.cloud.google.com> and create (or select) a project.
2. **APIs & Services → OAuth consent screen**:
   - User type: **External**
   - App name: **Barangay Culiat Safety**
   - User support email + developer contact email
   - App domain → Application home page: your production URL (e.g. `https://your-domain.example`)
   - Authorized domains: your production domain (and `vercel.app` domain if used)
   - Scopes: keep defaults (`.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`)
   - Save, then **Publish app** (required so returning users are not blocked by "unverified app" warnings).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins:
     - `https://your-production-domain`
     - `http://localhost:5173` (local Vite dev)
   - Authorized redirect URIs (must include the Supabase callback):
     - `https://fuphuqkxibmqermtcjoe.supabase.co/auth/v1/callback`
4. Copy the generated **Client ID** and **Client secret**.

## Step 2 — Supabase Dashboard

1. Open the Supabase project → **Authentication → Sign In / Providers → Google**.
2. Enable the provider and paste the **Client ID** and **Client secret** from Step 1.
3. Save.

## Result

- Google's account chooser and consent screens now show **"Barangay Culiat Safety"**
  (with your logo) instead of `fuphuqkxibmqermtcjoe.supabase.co`.
- No app code changes are required — `signInWithOAuth({ provider: 'google' })` in
  `frontend/src/pages/SignIn.tsx` stays exactly the same.

## Related

- Returning Google users now get an in-app **"Confirm sign-in"** step before the session
  is completed (implemented in `frontend/src/pages/AuthCallback.tsx`).
