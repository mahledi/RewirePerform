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
```

After the first deploy, add the hosted URL in Supabase:

- Authentication redirect URLs
- Site URL
- Any OAuth provider callback URLs, if providers are added later

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
