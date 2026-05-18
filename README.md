# RewirePerform

RewirePerform is a mental performance web app for athletes and coaches. The app is built as a portable Vite/React frontend backed by Supabase Auth, Postgres, RLS policies, RPC functions, and Edge Functions.

Lovable can still be used as a visual workflow, but GitHub is the source of truth for production code.

## Local Development

```bash
npm ci
npm run validate:env
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://localhost:8080
```

## Quality Gate

```bash
npm run ci
```

This runs environment-template validation, TypeScript checking, production build, and tests.

`npm run lint` exists, but is not yet part of the release gate because broader legacy lint debt still needs a focused cleanup pass.

## Deployment

See:

- [Deployment Runbook](docs/DEPLOYMENT.md)
- [Portability Plan](docs/PORTABILITY.md)

Independent hosting target:

```text
Build command: npm run build
Output directory: dist
```

Required frontend environment:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
```

## Supabase

The Supabase project state is represented by:

```text
supabase/config.toml
supabase/migrations
supabase/functions
```

Product-critical questionnaire and progress analysis are deterministic in app code and do not require Lovable AI credits.
