# Evidence & Outcomes Layer — Known Limitations (V1)

This document records honest limitations of the current Beweis-Engine.
It is intentionally conservative so that no marketing or coach-facing
copy overstates what the system can prove.

---

## 1. Cohort model is user-level, not true team-level

**V1 uses user-level `program_instances` with a `team_id` reference.
A true team-level `program_run` / cohort model is deferred.**

What this means:
- A `program_instance` represents **one athlete's run through the
  56-day program**, not a synchronized team cohort.
- Multiple athletes on the same team may start their cycles on
  different dates and proceed at different speeds.
- `compute_team_outcomes(team_id)` aggregates **all athlete instances
  attached to the team via `program_instances.team_id`**, regardless of
  whether they started on the same day.
- There is **no "Team Cohort 2026-Spring"** entity yet. If a team
  re-runs the program, it will appear as athletes starting new
  individual cycles, not as a single team cohort.

When this matters:
- Coaches cannot currently compare "Cycle 1 of Team A" against
  "Cycle 2 of Team A" as two distinct group-level cohorts.
- Pre/Post aggregates may mix athletes from different start months.

Planned (deferred):
- Add a `program_runs` table keyed by `(team_id, run_number,
  started_at, ended_at)`.
- Add `program_run_id` to `program_instances` so each athlete cycle
  is bound to a specific team-level run.
- Update `compute_team_outcomes` to optionally scope by `program_run_id`.

---

## 2. No control group / no causal claim

The system measures **observed change during the program**.
It does not run A/B comparisons against a control group.

Therefore the UI and any external communication must avoid:
- "proven", "bewiesen", "guaranteed", "garantiert"
- "rewired brain", "neuronal umverdrahtet"
- "caused improvement", "verursacht", "kausal"

The UI is allowed to say:
- "beobachtete Veränderung"
- "während des Programms"
- "aggregierte Teamdaten"
- "ohne Kontrollgruppe keine Wirksamkeitsaussage" (current disclaimer)

This wording is enforced both in `TeamEvidence.tsx` and in the
`disclaimer` field returned by `compute_team_outcomes`.

---

## 3. Anonymity threshold is hard-coded at n ≥ 5

- Team aggregates only render when at least **5 valid athletes**
  contributed.
- Pre→Post / Pre→Mid subscale rows only render when **5 paired
  athletes** exist for that subscale.
- Weekly check-in trends only render mood/energy/focus values when
  **≥ 5 distinct athletes contributed in that week**.

If a team has 4 active athletes, **no aggregate values are shown** —
this is a design choice, not a bug.

---

## 4. Effect size is paired Cohen's d_z, not d_av or Hedges' g

- `d_z = mean(diff) / sd_sample(diff)`
- This is the appropriate within-subject paired effect size.
- It is **not directly comparable** to between-group Cohen's d
  reported in many published RCTs.
- When `n < 10`, the row is flagged `low_confidence: true`.
- When `sd(diff) = 0` (every athlete changed by the exact same
  amount, e.g. perfect dummy data), `d_z` is returned as `NULL`.

---

## 5. Subscale direction is hard-coded in the frontend

`SUBSCALE_DIRECTION` in `src/components/coach/TeamEvidence.tsx`
maps each subscale to `higher_is_better` or `lower_is_better`.
Currently covers: CSAI-2R (cognitive_anxiety, somatic_anxiety,
self_confidence), SMTQ (confidence, constancy, control), Flow
short (absorption, fluency, anxiety/Besorgnis).

Adding a new validated assessment requires updating this map,
otherwise the row will render with a neutral arrow and no
"improvement" classification.

---

## 6. Coach RLS is aggregate-only — no individual drilldown

After the privacy hardening migration, coaches **cannot** read:
- `daily_journals` (any row)
- `daily_checkins` (individual rows)
- `assessments` (individual rows)

Coaches can only call `compute_team_outcomes(team_id)`, which
returns aggregates. There is intentionally **no escape hatch** to
view a single athlete's reflections from the coach UI.

---

## 7. Backfill artifacts (Cycle 1)

The cohort migration backfilled **one `program_instance` per
existing user**, with `cycle_number = 1` and `started_at` inferred
from `program_settings.program_start` or `CURRENT_DATE`. For users
who completed work before backfill, the start date may not match
their real-world start. This affects historical `days_available` /
`days_completed` only, not future cycles.

---

## 8. Verified at: 2026-04-28

- Migration `20260428122846_c5d3a14a-87ba-4644-aca1-9c9430660c3f.sql`
  is the final cohort + privacy + statistics migration.
- All `program_instance_id` columns confirmed present on the 6
  affected tables.
- `compute_team_outcomes(uuid, integer)` exists with `EXECUTE`
  granted to `authenticated`, revoked from `PUBLIC`.
- Forbidden vocabulary scan in `src/components/coach/` and
  `src/pages/Coach.tsx`: **0 matches**.
