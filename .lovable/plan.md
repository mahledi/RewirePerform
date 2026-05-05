## Goal

Promote `mahle.herzog@t-online.de` (user id `870240aa-6742-4374-84a2-fbc108559a71`) to the `admin` role so the account can access `/admin`.

## Current state

- Account exists, currently role = `athlete`.
- No admin exists in the system yet.
- Signup-based admin escalation was already blocked (last security fix). Promotion must happen via direct DB insert, exactly as documented in `docs/ADMIN_SETUP.md`.

## Change

Single data insert into `public.user_roles`:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('870240aa-6742-4374-84a2-fbc108559a71', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

The existing `athlete` row stays — a user can hold multiple roles. `has_role(uid, 'admin')` will return true after this.

## After the change

1. Sign out and back in with `mahle.herzog@t-online.de`.
2. Open `/admin` — Admin Control Center should load (aggregate stats, teams summary, feedback, exports, system health).
3. Verify with: `SELECT role FROM public.user_roles WHERE user_id = '870240aa-...'` → should return both `athlete` and `admin`.

## Out of scope

- No schema change, no RLS change, no code change.
- No additional accounts promoted.
- The Admin UI itself already exists (`src/pages/Admin.tsx`) and is gated by `has_role(..., 'admin')`.

## Risk

Minimal — single-row insert into an existing table with proper RLS. Admin sees only aggregate data per existing policies; no individual journals/reflections/scores are exposed (per `docs/ADMIN_SETUP.md`).
