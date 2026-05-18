# RewirePerform Portability Plan

This app should remain usable with Lovable while being able to run without Lovable at any time.

## Current Architecture

- Frontend: Vite, React, TypeScript, Tailwind, shadcn-style UI components.
- Backend: Supabase Auth, Postgres, RLS policies, RPC functions, Edge Functions.
- App state: Supabase user/session plus some local browser state for UX.
- PWA: `vite-plugin-pwa` with manual service-worker registration guards.
- Lovable usage: development/preview tooling only. Product-critical analysis is deterministic in app code.

## Independence Rules

1. GitHub is the source of truth.
2. Production deploys must build from GitHub, not from Lovable state.
3. Runtime configuration must come from environment variables, never hard-coded preview settings.
4. Supabase schema changes must be represented as migrations in `supabase/migrations`.
5. Edge Functions must be deployable with the Supabase CLI.
6. AI or content-generation scripts must be optional developer tooling, not required for user flows.

## Lovable-Specific Surface

- `lovable-tagger` is active only in Vite development mode and is not needed by the app runtime.
- `.lovable/` stores project memory/plans for Lovable workflows.
- `scripts/rewrite-comprehension.ts` calls the legacy Lovable AI Gateway and requires `LOVABLE_API_KEY`. Treat it as one-off developer tooling only.
- Deprecated Supabase functions `analyze-questionnaire` and `generate-transformation-summary` now return `410`; active questionnaire/progress logic is deterministic and does not require Lovable credits.

## Portable Hosting Targets

Good first choices:

- Vercel: simplest GitHub web deploy for Vite.
- Netlify: similarly simple, strong preview deploys.
- Cloudflare Pages: strong edge/network option, slightly more setup.

All of them should use:

```bash
npm ci
npm run build
```

Build output:

```text
dist
```

## Runtime Environment

Required for the web app:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
```

Required for Supabase Edge Functions:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Required only if push notifications are enabled:

```text
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
```

Run this before deploy:

```bash
npm run validate:env
```

## Exit Checklist

- GitHub branch builds locally with `npm run ci`.
- Independent hosting provider is connected to GitHub.
- Supabase Auth redirect URLs include the production domain and preview domain.
- Supabase migrations apply cleanly to a fresh database.
- Supabase Edge Functions deploy from the repo.
- Secrets are configured in Supabase and hosting provider dashboards.
- Lovable preview can be disabled without breaking login, check-in, questionnaire, coach, admin, or PWA flows.
