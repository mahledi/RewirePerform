# P0 Stabilization — Remove AI/Credit Dependencies

Goal: App runs fully without `LOVABLE_API_KEY`. No active code path calls Lovable AI Gateway. Existing UX preserved with deterministic replacements.

## Scope of confirmed AI touchpoints

Active calls found:
- `src/components/questionnaire/QuestionnaireResults.tsx:114` → `invoke("analyze-questionnaire")`
- `src/pages/Progress.tsx:54` → `invoke("generate-transformation-summary")`
- `src/components/coach/TeamMentalState.tsx:97` → `invoke("team-mental-state")`
- `supabase/functions/team-mental-state/index.ts:254-294` → optional Lovable AI call to generate `vibe`
- `supabase/functions/analyze-questionnaire/index.ts` → AI gateway
- `supabase/functions/generate-transformation-summary/index.ts` → AI gateway

`src/lib/microAdjustment.ts` is already deterministic (only string/profile logic). Daily tasks are sourced from `src/content/dailyContent.ts` / `matrixDays.ts` — no active AI generation.

## Changes

### 1. Deterministic questionnaire analysis
- Add `src/lib/deterministicQuestionnaireAnalysis.ts` exporting `buildDeterministicQuestionnaireAnalysis(answers, profile?)`. Returns same shape consumed by `QuestionnaireResults`: `summary`, `strengths[]`, `development_areas[]`, `patterns[]`, `recommendations[]`, `mental_score` (0–100), `dominant_category`, `inner_excellence_profile { growth_mindset_score, presence_level, ego_freedom_score, emotional_control_score, purpose_orientation_score, pressure_regulation_score }`. Optional `training_day_tasks` / `rest_day_tasks` only if UI still reads them — framed as general recommendations.
- Scoring: average Likert-style numeric answers per category (identity, resilience, focus, emotions, motivation, competition, recovery, environment, philosophy, neurocognition, inner_excellence, deep_profile). Map text/multi-choice to neutral defaults. Robust against missing answers.
- Pattern rules: pressure↑+recovery↓, motivation↑+focus↓, self-criticism↑+identity↓, recovery↓.
- Copy uses "deutet darauf hin / Orientierung / kein Diagnosewert".
- Edit `src/components/questionnaire/QuestionnaireResults.tsx`: remove the `invoke("analyze-questionnaire")` block; build analysis locally, persist to `questionnaire_responses.analysis` via existing supabase update; update headings to "Dein Startprofil" / "Deterministische Auswertung".

### 2. Deterministic progress summary
- Add `src/lib/deterministicProgressSummary.ts` exporting `buildProgressSummary(baseline, retest, questions)`. Counts improved/unchanged categories, names strongest delta and most-open area. Returns `{ summary: string, hasEnoughData: boolean }`.
- Edit `src/pages/Progress.tsx`: replace `invoke("generate-transformation-summary")` with local call. If insufficient data: "Noch nicht genug Daten für eine Verlaufszusammenfassung."

### 3. Deterministic team mental state
- Edit `supabase/functions/team-mental-state/index.ts`: delete the AI block (lines ~254–320). Replace with deterministic `vibe` from existing aggregates:
  - `readiness_index >= 75` → "Team-Bereitschaft wirkt hoch."
  - 55–74 → "stabil"; <55 → "reduziert"
  - Append clauses for stress≥7+recovery≤4, pressure≥7, team_connection≤4
  - `n < 5` → null + "Zu wenig Daten…"
- No `LOVABLE_API_KEY`, no `ai.gateway` reference remains in this function.
- Edit `src/components/coach/TeamMentalState.tsx` copy: "Team-Zusammenfassung / Deterministische Auswertung / Basierend auf aggregierten Team-Pulse-Werten" instead of "KI-Vibe".

### 4. Deprecate AI-only edge functions
- `supabase/functions/analyze-questionnaire/index.ts` and `supabase/functions/generate-transformation-summary/index.ts`: replace bodies with a 410 Gone JSON stub (`{ error: "deprecated, replaced by deterministic client logic" }`) and a header comment marking them deprecated. Keeps deployments stable; no AI gateway calls. (Avoid full deletion to keep migrations/risk low.)

### 5. Copy sweep
- Search and replace user-facing strings: "KI erstellt", "KI generiert", "KI passt … an", "adaptive KI", "vollständig adaptiv", "KI-Analyse", "KI-Vibe", "AI coach" → "56-Tage-System", "feste Progression", "persönliche Einordnung", "Micro-Adjustment", "deterministische Auswertung", "Team-Zusammenfassung". Only edit files that currently contain those phrases (none found in landing components from initial scan; will re-grep across `src/` before editing).

### 6. Validation
- Final ripgrep for `LOVABLE_API_KEY` and `ai.gateway.lovable.dev` across `src/` and `supabase/functions/` — must return zero hits in active call sites (only deprecated stubs / comments).
- TypeScript + build run by harness.

## Out of scope (explicitly untouched)
56-day content, daily tasks, science bites, comprehension, journals, Flame system, Evidence Engine, Admin Dashboard, Coach Dashboard structure, calendar ownership, FKS direction, comprehension `correctOptionId`, completion logic, co-coach permissions, micro-adjustment behavior (only comment cleanup if needed), DB schema, `personalized_tasks` table.

## Files to change
- new `src/lib/deterministicQuestionnaireAnalysis.ts`
- new `src/lib/deterministicProgressSummary.ts`
- edit `src/components/questionnaire/QuestionnaireResults.tsx`
- edit `src/pages/Progress.tsx`
- edit `src/components/coach/TeamMentalState.tsx` (copy only)
- edit `supabase/functions/team-mental-state/index.ts` (remove AI block, deterministic vibe)
- edit (stub) `supabase/functions/analyze-questionnaire/index.ts`
- edit (stub) `supabase/functions/generate-transformation-summary/index.ts`
- copy edits in any landing/marketing file that contains AI claims (re-scanned at edit time)
