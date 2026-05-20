# Launch-Study V1

Launch-Study V1 turns the existing RewirePerform tracking layer into a privacy-safe internal evaluation system. It is built for product review, club presentations, pilot reporting, and later research preparation.

## What It Measures

- Activation and Day-1 completion
- 7-day and 28-day active usage
- 56-day completion
- Completed program days
- Check-in count
- Comprehension check count
- Journal count only
- Pre/Mid/Post readiness
- Development Index readiness
- Team/cohort aggregate quality
- Missingness and dropout risk indicators

## Privacy Boundary

The Study layer does not export:

- journal text
- free reflections
- raw individual check-ins
- raw questionnaire answers
- individual psychological scores
- player-identifying development labels

Coach-facing rules remain stricter than admin evaluation rules:

- coaches see team aggregates only from `n >= 5`
- coaches never see raw free text
- coaches never see individual histories

## App Store / Claim Boundary

Allowed language:

- internal program evaluation
- observed development
- team/cohort aggregates
- routines, reflection, adherence, performance support

Avoid:

- diagnosis
- medical effect
- causal proof without a control group
- claims that the app proves neuroplasticity

## Database Objects

Migration:

`supabase/migrations/20260520170000_launch_study_v1.sql`

Tables:

- `study_cohorts`
- `study_participants`
- `study_measurement_windows`
- `study_aggregate_snapshots`
- `study_export_manifests`

Admin-only RPCs:

- `get_admin_study_overview(include_test boolean default false)`
- `create_study_aggregate_snapshot(_cohort_id uuid default null, include_test boolean default false)`

## Admin UI

Admin Control Center now includes:

- Study / Evidence tab
- activation and adherence metrics
- measurement readiness
- data-quality panel
- cohort table
- export buttons for:
  - `study_summary.json`
  - `cohort_metrics.csv`
  - `measurement_windows.csv`
  - `data_quality.csv`
  - `export_manifest.json`

## Launch QA

Before launch:

1. Apply the migration to the Lovable Cloud database.
2. Reload PostgREST schema:

```sql
select pg_notify('pgrst', 'reload schema');
```

3. Open Admin Control Center.
4. Verify Study / Evidence loads without errors.
5. Export all five files.
6. Confirm exports contain no private text or individual scores.
7. Create one aggregate snapshot.
8. Confirm no coach/player can access the Study tab or RPCs.

## Phase 2 Direction

After real pilot data:

1. Add formal cohort registry workflow.
2. Add export manifests per pilot/club.
3. Add missingness/dropout report.
4. Add paired Pre/Post aggregate analysis.
5. Add presentation dashboard for cohort-level evidence.
6. Add controlled migration path from Lovable Cloud to owned Supabase infrastructure.
