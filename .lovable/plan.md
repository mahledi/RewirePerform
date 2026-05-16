# P0 QA Test Lab — Admin-Only End-to-End Program Testing

Build an admin-gated QA Test Lab at `/admin/qa` that creates a fake coach + 5 athletes + 1 team, and lets you fast-forward the 56-day program by overriding "today" for that test cohort only. Real users and real data stay untouched.

## What you'll be able to do

1. Open `/admin/qa` (admin only).
2. Click **Create QA Cohort** → get 1 coach, 5 athletes, 1 team, credentials displayed once.
3. Log in as any of them via `/auth` with the shown password.
4. From `/admin/qa`, jump the test team to Day 1 / 7 / 28 / 56, or +1 day, or pick a custom day.
5. The QA athletes' app behaves as if today is the simulated date — check-ins, journals, comprehension, completions, snapshots all write under the simulated date.
6. Real coach/admin metrics exclude QA data by default; QA coach dashboard still shows the QA team normally.
7. **Reset QA Cohort Data** wipes only QA-flagged rows. Auth users are archived, not deleted (safer).

## Scope guardrails

- No changes to 56-day content, comprehension, scoring, AI/deterministic analysis, landing page, real product UX.
- No new AI calls. No RLS weakening.
- QA tooling is gated by `admin` role server-side (edge function checks `has_role`) AND client-side route guard.

## Database changes (one migration)

Add columns:
- `profiles.is_test_user boolean default false`
- `teams.is_test_team boolean default false`
- `program_instances.is_test_instance boolean default false`

New table `qa_time_overrides`:
- `id, scope ('team'|'user'), team_id, user_id, simulated_date date, simulated_day_number int, created_by, created_at, updated_at`
- RLS: only `admin` can select/insert/update/delete. No coach/athlete access (resolution happens server-side via edge function + client lib reads under admin... see note below).

Note on RLS for `qa_time_overrides`: test athletes need to **read** their team's override at runtime. Two safe options:
- (A) Add a SELECT policy: athletes can read overrides where they are member of the referenced team AND their profile `is_test_user = true`. Real users never match.
- (B) Resolve via a `SECURITY DEFINER` function `get_effective_today(_user_id)` that admins/test users can call.

Plan uses **(B)** — cleaner, no extra RLS surface. RLS on `qa_time_overrides` stays admin-only.

New helpers (SECURITY DEFINER, search_path public):
- `get_effective_today(_user_id uuid) returns date` — returns simulated date if user is test user with active override, else `CURRENT_DATE`.
- `archive_qa_cohort(_team_id uuid)` — admin-only; deletes QA-flagged daily/journal/checkin/comprehension/snapshot/assessment/questionnaire/program_instance/team_member rows for that test team; marks team archived (rename + flag).

Update `get_admin_overview_stats` and `get_admin_teams_summary` to **exclude** rows linked to `is_test_user`/`is_test_team` by default. Add a second function variant or boolean param `include_test boolean default false`.

## Edge functions

`supabase/functions/qa-create-cohort/index.ts`
- Validates JWT, checks caller is admin via service-role client.
- Uses Admin API (`auth.admin.createUser`) with `email_confirm: true` for 6 accounts.
- Inserts profiles (`is_test_user=true`), user_roles, team (`is_test_team=true`, `program_start_date=today`), team_members, program_instances (`is_test_instance=true`).
- Returns credentials JSON (shown once to admin).

`supabase/functions/qa-set-time/index.ts`
- Admin-only. Upserts `qa_time_overrides` for `{team_id, simulated_date, simulated_day_number}`.

`supabase/functions/qa-archive-cohort/index.ts`
- Admin-only. Calls `archive_qa_cohort` RPC.

All three: CORS, `getClaims` JWT check, `has_role(..., 'admin')` enforcement.

## Frontend changes

New files:
- `src/pages/AdminQA.tsx` — cohort list, Create/Reset buttons, credentials table with copy buttons, day-jump controls, simple checklist (computed from DB queries).
- `src/lib/qaTime.ts` — `getEffectiveToday(userId)` calling RPC; `getEffectiveProgramDay(userId)` wrapping existing program-day calc with override.
- `src/components/qa/QATestBanner.tsx` — small badge shown in dashboards when current user is test user or current team is test team.

Route: add `<Route path="/admin/qa" element={<ProtectedRoute><AdminQA/></ProtectedRoute>}>` in `App.tsx`. Inside the page, guard with `role === 'admin'` (else redirect to `/`).

Wire simulated date into daily write paths (only the date stamping, no logic changes):
- `src/pages/Dashboard.tsx` (today resolution)
- `src/components/dashboard/DailyCheckin.tsx` (date stamp)
- `src/pages/Journal.tsx` (date stamp)
- `src/components/daily/ComprehensionCheck.tsx` (date/day if applicable)
- `src/lib/programProgress.ts` / snapshot writers
- `src/lib/getCurrentProgramDay.ts` → accept an override date

Pattern: each call site loads `effectiveToday` once via `qaTime.ts`. For real users this returns real `today` (no behavior change).

Exclude test data from real metrics:
- Update RPCs above; ensure `Admin.tsx` consumes the test-excluding versions by default with a toggle "Include test data" on `/admin/qa` only.

## Security summary

- `/admin/qa` route + page guarded by admin role.
- Edge functions verify admin via JWT claims + `has_role`.
- Service role used only inside edge functions.
- `qa_time_overrides` RLS = admin-only; runtime resolution via SECURITY DEFINER RPC.
- No impersonation. Admin logs in as QA user with displayed credentials.
- Real-user dashboards unaffected; QA banner only renders when `is_test_user`/`is_test_team`.

## Files to add / change (preview)

Add: `src/pages/AdminQA.tsx`, `src/lib/qaTime.ts`, `src/components/qa/QATestBanner.tsx`, `supabase/functions/qa-create-cohort/index.ts`, `supabase/functions/qa-set-time/index.ts`, `supabase/functions/qa-archive-cohort/index.ts`.

Edit: `src/App.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Journal.tsx`, `src/components/dashboard/DailyCheckin.tsx`, `src/components/daily/ComprehensionCheck.tsx`, `src/lib/getCurrentProgramDay.ts`, `src/lib/programProgress.ts`, `src/pages/Admin.tsx` (link to `/admin/qa` + use test-excluded stats).

Migration: one SQL file with column adds, `qa_time_overrides` table + RLS, `get_effective_today`, `archive_qa_cohort`, updated admin stat RPCs.

## Acceptance criteria mapping

All 15 acceptance criteria covered. Test-data exclusion is the default for `get_admin_overview_stats` / `get_admin_teams_summary`; QA page can opt-in.

## Open questions before I build

1. **Fixed dev password** (e.g. `RewireQA!2026`) shown in UI, or **random per cohort**? Random is safer; fixed is faster for repeat tests.
2. **Reset behavior**: hard-delete QA auth users too, or only archive (keep auth users, wipe their data + rename team)? Archive is safer.
3. **Env gate** `VITE_ENABLE_QA_TOOLS`: add it, or rely solely on admin-role gating? Admin-role gating is sufficient; env adds friction.
