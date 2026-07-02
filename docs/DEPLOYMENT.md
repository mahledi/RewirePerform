# Deployment Runbook

## Local Verification

```bash
npm ci
npm run validate:env
npm run typecheck
npm run build
npm test
```

Known current status: `npm run lint` is intentionally not part of the deploy gate yet because the project has broader pre-existing lint debt. Add it once that debt is cleaned up.

## Web Deploy

Use any static host that supports Vite.

Settings:

```text
Install command: npm ci
Build command: npm run build
Output directory: dist
Node version: 22
```

Environment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
VITE_SENTRY_DSN optional, enables frontend error monitoring
VITE_APP_ENV production | staging | development
VITE_RELEASE_SHA optional, current Git commit SHA
```

The Supabase client intentionally has no production fallback. Every host
must set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and
`VITE_SUPABASE_PROJECT_ID` explicitly. This prevents a new host from silently
talking to the wrong Supabase project.

If `VITE_SENTRY_DSN` is empty, the app uses the public RewirePerform Sentry DSN fallback defined in `src/lib/monitoring.ts`.
This is intentional for Lovable builds where `VITE_` environment variables are not exposed in the UI. The DSN is a public browser
endpoint, not a private secret. For owned hosts, prefer setting `VITE_SENTRY_DSN` explicitly so the fallback can be removed later.
When Sentry is enabled, only technical context is sent. Do not add e-mail,
journal text, free answers, private reflections, or individual psychological
scores to Sentry tags, contexts, breadcrumbs, or extras.

After the first deploy, add the hosted URL in Supabase:

- Authentication redirect URLs
- Site URL
- Any OAuth provider callback URLs, if providers are added later

For the RewirePerform launch domain, prefer:

```text
Production URL: https://rewireperform.com
Support URL: https://rewireperform.com/support
Privacy URL: https://rewireperform.com/privacy
```

The iOS premium WebView shell is built from the same `dist` output via Capacitor:

```bash
npm run app:build
npm run app:open:ios
```

## Supabase Deploy

Install and log in to the Supabase CLI, then link the project:

```bash
supabase login
supabase link --project-ref twceqincrbrenyuqukpj
```

Apply migrations:

```bash
supabase db push
```

Deploy Edge Functions:

```bash
supabase functions deploy team-mental-state
supabase functions deploy qa-create-cohort
supabase functions deploy qa-set-time
supabase functions deploy send-daily-reminder
supabase functions deploy get-vapid-public-key
```

`send-daily-reminder` should be invoked every 30 minutes in production so full-hour and half-hour reminder slots are both covered.

Deprecated stubs may also be deployed for compatibility:

```bash
supabase functions deploy analyze-questionnaire
supabase functions deploy generate-transformation-summary
```

Set required secrets:

```bash
supabase secrets set SUPABASE_URL=...
supabase secrets set SUPABASE_ANON_KEY=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

For push notifications:

```bash
supabase secrets set VAPID_PUBLIC_KEY=...
supabase secrets set VAPID_PRIVATE_KEY=...
supabase secrets set VAPID_SUBJECT=mailto:hello@rewireperform.com
```

## Launch Operations

Apply the Launch-Ops migration before the first real pilot:

```bash
supabase db push
```

It creates `app_event_log` plus `get_admin_ops_status()`. This is a
privacy-safe incident layer for technical failures in login, teamcode,
check-in, journal, assessment, push and pre-training flows. It is not a
general clickstream or activity analytics table.

Operational checks after deploy:

1. Log in as an athlete.
2. Complete a check-in and journal.
3. Open `/pre-training`.
4. Log in as admin and open Systemstatus.
5. Confirm Launch-Ops shows technical failures and no private content.

Incident and pilot rules live in `docs/LAUNCH_OPERATIONS.md`.

## Rollback

Frontend rollback:

1. Revert the GitHub PR or redeploy the previous successful commit.
2. Clear browser service-worker cache if PWA behavior looks stale.

Database rollback:

1. Prefer forward-fix migrations for production.
2. Restore from Supabase backup only for severe data/schema incidents.
3. Never run destructive SQL manually without a backup and a written rollback note.

## Release Gate

Before merging a deploy PR:

- `npm run ci` passes.
- The branch was tested locally with the intended Supabase project.
- Auth, questionnaire, dashboard check-in, coach team view, settings, and admin QA still load.
- Any new Supabase table has RLS enabled and policies reviewed.
- Any new secret is documented here and in `.env.example`.
- Admin Systemstatus / Launch-Ops loads without exposing private content.

Before TestFlight/App Store submission:

- Follow `docs/APP_STORE.md`.
- Confirm `rewireperform.com` works as the production domain.
- Confirm App Store privacy labels match actual collected data.
