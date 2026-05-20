# Tracking QA and Presentation Data

This runbook verifies the operational evidence layer around RewirePerform:
team codes, role assignment, activity tracking, progress snapshots, aggregate
coach/admin views, and presentation-ready exports.

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
3. Record the generated coach, athlete accounts, player code, and coach code.
4. Validate player-code join with a fresh test athlete:
   - role becomes `athlete`
   - user becomes a `team_members` row
   - user lands in player onboarding/dashboard flow
5. Validate coach-code join with a fresh test coach:
   - role becomes `coach`
   - user becomes a `team_members` row
   - user lands in coach flow
6. Use the five QA athletes to complete enough days for aggregate visibility.
7. Simulate days 1, 2, 7, 14, 28, 42, and 56 through QA time.
8. After each critical day, reload the athlete dashboard to force a progress snapshot.

## Data Checks

For each tested athlete/day, confirm:

- `user_day_assignments` has one row for the day
- `daily_checkins` has one row for the day
- `user_day_completion` is completed and scoped to the current program instance
- `comprehension_check_instances` is completed when comprehension was answered
- `program_progress_snapshots` updates without duplicate active-instance rows
- `daily_journals` may contain private text, but exports only count rows

For the team, confirm:

- Coach aggregates stay hidden or low-confidence below `n < 5`
- Coach aggregates render at `n >= 5`
- Coach cannot access journal text or raw private answers
- Admin overview excludes QA data when `include_test = false`
- Admin QA/test data remains visible only in QA tooling or explicit include-test calls

## Presentation Exports

The Admin Control Center provides a dedicated presentation package:

- `presentation_metrics.json`
- `presentation_team_summaries.csv`
- `presentation_kpis.csv`
- `program_progress.csv`
- `checkin_activity.csv`
- `comprehension_summary.csv`
- `system_health.csv`

Use these exports for launch review, club presentations, and internal progress
reporting. Keep all claims performance-oriented:

- use "observed development", "program activity", "completion", "adherence"
- avoid diagnosis, medical claims, and causal claims without a control group

## Launch Decision

Mark the layer as launch-ready only if:

- team-code role assignment works for player and coach codes
- all key tracking tables are populated by real user actions
- progress snapshots match expected completion/adherence values
- admin exports contain no private text or individual psychological values
- QA data does not pollute production metrics
- `npm run typecheck`, `npm test`, and `npm run build` pass

