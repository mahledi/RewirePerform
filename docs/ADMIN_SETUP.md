# Admin Setup

The Admin Control Center lives at `/admin` and is gated by `user_roles.role = 'admin'`.

## Promote your test account to admin

There is intentionally no "become admin" UI. Promotion happens via a one-off SQL
statement run by the product owner. Replace `ADMIN_EMAIL_HERE` with the email of
the existing test account.

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'ADMIN_EMAIL_HERE'
ON CONFLICT (user_id, role) DO NOTHING;
```

After running, sign out and back in with the test account. Open `/admin`.

## What admins can see

Aggregate-only by default:

- Overview counts (users, athletes, coaches, teams, check-ins, assessments, comprehension)
- Per-team summary with evidence-readiness flag
- Cross-team evidence charts (adherence, Pre/Mid/Post counts)
- Submitted feedback (status: open / reviewed / resolved + admin note)
- CSV exports (anonymized)
- System health: data quality counters

## What admins do NOT see by default

- Raw `daily_journals` content
- `daily_checkins.reflection`
- Individual assessment answers
- Individual psychological labels
- Free-text from questionnaires

A separate "sensitive data audit" surface is intentionally **not** built.

## Backend functions

- `get_admin_overview_stats()` — global aggregates
- `get_admin_teams_summary()` — per-team aggregates + evidence status
- `get_admin_system_health()` — data-quality counters
- `update_feedback_status(id, status, note)` — admin moderation

All check `has_role(auth.uid(), 'admin')` internally. Anon execute revoked.
