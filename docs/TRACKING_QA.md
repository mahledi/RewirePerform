# Tracking QA and Presentation Data

This runbook verifies the operational evidence layer around RewirePerform:
team codes, role assignment, activity tracking, progress snapshots, aggregate
coach/admin views, and immutable Evidence Data Locks.

## Goal

RewirePerform should be able to support internal program evaluation with
privacy-safe data:

- activity and adherence
- program completion and streaks
- check-in participation
- comprehension completion and averages
- journal entry counts only
- assessment readiness counts
- team-level aggregate status
- system health and data-quality counters

This is internal product/program evaluation. It is not a clinical study, not a
diagnosis, and not a causal claim without a control group.

## Privacy Rules

Exports and admin presentation data must never include:

- journal text
- free reflections
- individual check-in history
- individual assessment answers
- individual questionnaire scores
- individual psychological labels

Allowed outputs:

- anonymous or team-level counts
- aggregate rates and averages
- completion/readiness status
- operational data-quality counters
- journal counts without text

## Fresh QA Cohort Flow

1. Login as admin and open `/admin/qa`.
2. Create a fresh QA cohort.
3. Record the generated coach account, athlete accounts, and athlete team code.
4. Validate player-code join with a fresh test athlete:
   - role remains `athlete`
   - user becomes a `team_members` row
   - user lands in player onboarding/dashboard flow
5. Validate the protected coach path:
   - a public athlete signup cannot request or insert the `coach` role
   - legacy coach codes are rejected by the public join function
   - an admin finds the confirmed existing account by exact email
   - the atomic approval assigns the coach role, one team, and one audit row
6. Start with day 1 and complete the normal dashboard flow with at least one QA athlete.
7. Use the Evidence Parity Gate to jump directly to each scheduled transfer day:
   `4, 7, 11, 14, 18, 21, 25, 28, 32, 35, 39, 42, 46, 49, 53, 56`.
8. Complete each reached transfer day with all five QA athletes. The gate marks a
   day as passed only when assignments, completions, and expected evidence rows
   agree for the full synthetic cohort. A rest day is counted as an intentional
   skip, not as a missing answer.
9. At the end of every simulated week, login as the QA coach and save the
   structured team review. The coach week must follow the simulated QA date.
10. Return to `/admin/qa` and refresh the gate. `PASS` means every reached
    transfer day and every reached coach week is complete; `IN_PROGRESS` means
    the pipeline is intact but work is still missing; `FAIL` means an integrity
    or isolation invariant was violated.
11. Open Admin > NLZ Pilot Center > QA to inspect the same count-only report.
    Production remains the default mode. Production snapshots and standard
    exports are disabled in QA mode.

## Data Checks

For each tested athlete/day, confirm:

- `user_day_assignments` has one row for the day
- `daily_checkins` has one row for the day
- `daily_checkins.program_instance_id` matches the active program instance
- `user_day_completion` is completed and scoped to the current program instance
- `comprehension_check_instances` is completed when comprehension was answered
- `program_progress_snapshots` updates without duplicate active-instance rows
- `daily_journals` may contain private text, but exports only count rows
- `daily_journals.program_instance_id` matches the active program instance
- `questionnaire_responses.program_instance_id` is present when an active program instance exists

For the team, confirm:

- Coach aggregates stay hidden or low-confidence below `n < 5`
- Coach aggregates render at `n >= 5`
- Coach individual activity shows only operational status: last activity, days completed, completion rate, streak, recent check-in count, journal count only
- Coach cannot access journal text or raw private answers
- Admin overview excludes QA data when `include_test = false`
- Admin-QA-Daten bleiben nur in QA-Werkzeugen oder einem expliziten
  `qa_only`-Aufruf sichtbar. Ein solcher Aufruf enthaelt keine Production-Daten.
- The QA parity report exposes counts and statuses only; it contains no athlete
  names, emails, response values, journals, or reflections
- QA participants and QA observations are both zero in the production-only
  evidence summary
- A completed non-rest evidence day never exists without its atomically linked
  evidence row, and an evidence row never exists without completion
- All 16 transfer days use the canonical protocol schedule
- The QA coach week follows the simulated date rather than the real calendar
- Presentation activity metrics count athlete activity only; admin/coach test clicks must not inflate adherence or program usage.

## What QA Proves

The QA parity gate is strong evidence that the covered technical path behaves as
designed: the real dashboard creates assignments, `save_daily_tracking_v3`
stores completion and transfer evidence atomically, coach reviews use the same
backend, privacy boundaries hold, and test data remains separated from
production exports.

It is not a substitute for a real-calendar smoke test, a physical iPhone test,
push-notification testing, or a live athlete pilot. It also does not prove that
athletes understand the questions, use the app consistently, or improve in
sport. Those claims require real users and the defined evidence design.

## Automated Hardening Checks

The local integration candidate adds three complementary database contracts:

- `npm run test:tracking-runtime:sql` verifies self-scoped, idempotent progress
  snapshots, unique completion days, completion rate, streaks, active-instance
  scope and foreign-user denial.
- `npm run test:minor:sql` verifies the current adult/minor authorization
  states, consent withdrawal, solo and team `n = 4/5` boundaries, completed-run
  read eligibility, immutable Data Locks and the service-role-only machine read
  contract.
- `npm run privacy:verify` verifies that private text and individual
  psychological values stay outside coach and export paths, and that QA and
  Production evidence scopes remain mutually exclusive.

These checks run against a local PostgreSQL-compatible harness and repository
contracts. Before production activation, repeat grant, overload, RLS, JWT,
Edge-Function and aggregate checks against the actual target project without
reading private content.

## Supabase Precheck SQL

Run before applying tracking hardening migrations. All queries should return
zero rows. If a query returns rows, stop and inspect before changing indexes.

```sql
select user_id, program_instance_id, date, count(*) as rows
from public.daily_checkins
where user_id is not null and program_instance_id is not null
group by user_id, program_instance_id, date
having count(*) > 1;

select user_id, date, count(*) as rows
from public.daily_checkins
where user_id is not null and program_instance_id is null
group by user_id, date
having count(*) > 1;

select user_id, program_instance_id, date, count(*) as rows
from public.daily_journals
where user_id is not null and program_instance_id is not null
group by user_id, program_instance_id, date
having count(*) > 1;

select user_id, date, count(*) as rows
from public.daily_journals
where user_id is not null and program_instance_id is null
group by user_id, date
having count(*) > 1;
```

## Freigegebene Evidence-Exporte

Live-Metriken im Admin Control Center sind fuer interne operative Kontrolle da.
Sie koennen nicht direkt exportiert werden. Fuer externe Auswertung muss zuerst
in der Pilotzentrale ein unveraenderlicher Team- oder Solo-Data-Lock erstellt
werden. Erst dessen gepruefter Inhalt kann als JSON beziehungsweise als
abgeleitetes CSV-Paket heruntergeladen werden.

Jeder Data Lock enthaelt eine Schema-Version, einen Source-Cutoff, eine
SHA-256-Pruefsumme, ein Analysemanifest, Gruppengroessen, Missingness und die
Claim Boundary. Alte Study-/NLZ-Snapshot-Builder besitzen im aktuellen
Hardening-Kandidaten kein Ausfuehrungsrecht fuer App-Nutzer mehr.

Keep all claims performance-oriented:

- use "observed development", "program activity", "completion", "adherence"
- avoid diagnosis, medical claims, and causal claims without a control group

## Launch Decision

Mark the layer as launch-ready only if:

- athlete team codes join without changing roles, while legacy coach codes and
  manipulated role requests cannot elevate access
- admin-approved coach access is atomic, audited, and tied to a confirmed
  existing account
- all key tracking tables are populated by real user actions
- progress snapshots match expected completion/adherence values
- Data-Lock exports contain no private text or individual psychological values
- QA data does not pollute production metrics
- App Store privacy boundaries are still true: no advertising tracking, no data brokers, no marketing pixels, no private content in diagnostics or exports
- `npm run typecheck`, `npm test`, `npm run build`,
  `npm run test:evidence:sql`, `npm run test:minor:sql`,
  `npm run test:tracking-runtime:sql`, `npm run test:access:sql`,
  `npm run test:deletion:sql` and `npm run privacy:verify` pass
