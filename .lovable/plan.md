## Flame / Consistency System — Plan

A premium, non-manipulative consistency card on the individual player dashboard. Pure frontend, reuses the data that `upsertTodaySnapshot` already writes to `program_progress_snapshots` and `user_day_completion`. No DB changes, no AI, no coach/admin exposure.

### Files

**New**
- `src/lib/flameStats.ts` — pure helper. Builds `FlameStats` from completion rows + program meta.
- `src/components/dashboard/FlameCard.tsx` — premium dark glass card with animated flame, level, streaks, today-state line.
- `src/components/dashboard/FlameProgressGrid.tsx` — optional 56-cell consistency grid (rendered inside FlameCard, collapsible).

**Edited**
- `src/pages/Dashboard.tsx` — mount `<FlameCard />` near the top of the player dashboard (below the "today / current program day" block, above tasks). Trigger a subtle pulse + toast when today transitions to completed.

No changes to: Coach page, Admin page, DailyCheckin logic, ScienceBite, Comprehension, Assessments, Evidence Engine, Team Pulse, edge functions, or `dailyContent`.

### Data — no backend changes

Reuse what's already loaded for the dashboard:
- `program_progress_snapshots` (today's row written by `upsertTodaySnapshot`) → `current_streak`, `longest_streak`, `days_completed`, `days_available`, `completion_rate`, `program_day`.
- `user_day_completion` rows for the active `program_instance_id` → `completed_at` per day to derive `lastCompletedDate`, `completedToday`, and the 56-day grid.
- `getOrCreateActiveInstance` → `program_instance_id` scoping (already used elsewhere).

No new tables, no RPC, no migrations, no writes.

### `flameStats.ts` API

```ts
export type FlameLevel = "ember" | "spark" | "flame" | "momentum" | "commitment" | "identity";
export type FlameState =
  | "new_start"      // 0 days completed
  | "active"         // streak running, today not yet completed
  | "saved_today"    // completed today
  | "at_risk"        // missed yesterday, streak still > 0 (graceful copy)
  | "recovered"      // returning today after a gap
  | "broken";        // gap > 1 day, streak reset

export interface FlameStats {
  currentStreak: number;
  longestStreak: number;
  totalCompletedDays: number;
  daysAvailable: number;       // capped at 56
  completionRate: number;      // 0..1
  programDay: number | null;
  completedToday: boolean;
  lastCompletedDate: string | null;
  missedDaysCount: number;     // daysAvailable - totalCompletedDays
  flameLevel: FlameLevel;
  levelLabel: string;          // "Funke" | "Flamme" | "Momentum" | "Commitment" | "Identität"
  flameState: FlameState;
  message: string;             // short German line, see Copy
  completedDayNumbers: number[]; // for the 56-grid
}

export function buildFlameStats(input: {
  completions: { day_number: number; completed_at: string | null; completion_status: string }[];
  snapshot?: { current_streak: number; longest_streak: number; days_available: number; days_completed: number; program_day: number | null } | null;
  today: Date;
}): FlameStats;
```

Determinism:
- Level thresholds: 0 → ember, 1–2 → spark/Funke, 3–6 → flame/Flamme, 7–13 → momentum/Momentum, 14–27 → commitment/Commitment, 28+ → identity/Identität.
- Streaks: prefer values from `snapshot` (already correct, cohort-scoped). When snapshot missing, recompute from `completed_at` dates using same algorithm as `programProgress.ts`.
- `flameState` derived from (completedToday, daysSinceLastCompleted, currentStreak, totalCompletedDays).

### `FlameCard.tsx` UI

- Dark glass card matching `bg-gradient-card border-glow` already used on the dashboard.
- Header row: animated Lucide `Flame` icon with subtle CSS glow (green primary at low levels, warm amber tint from level Momentum upward — purely Tailwind/HSL tokens, no new colors). Right side: level badge ("Momentum", "Identität").
- Big number: current streak ("7 Tage in Folge").
- Sub-stats row: longest streak · completed days · completion %.
- One-line state message (see Copy).
- "56-Tage Konsistenz" toggle reveals `FlameProgressGrid` (7×8 dots: completed = filled primary, today = ring, missed-available = muted, future = very dim). No red anywhere.
- Mobile-first; no childish elements; no confetti.
- Subtle `framer-motion` pulse (already in deps) on the flame icon when `completedToday` flips true within the session, plus a `sonner` toast: "Flamme gesichert. Eine weitere Wiederholung im System." Milestone toasts at streak === 3, 7, 14, 28.

### Copy (German, non-shaming)

| State | Message |
|---|---|
| new_start | "Startbereit. Eine saubere Wiederholung beginnt das System." |
| active | "Du hältst deine Wiederholung am Leben." |
| saved_today | "Flamme gesichert. Heute zählt." |
| at_risk | "Heute ist noch offen. Eine saubere Wiederholung reicht." |
| recovered | "Stark: Rückkehr ist Teil des Systems." |
| broken | "Streaks sind Signale, keine Urteile. Starte die nächste Serie." |

Long-streak override (≥28): "Du beweist nichts. Du wirst jemand, der wiederkommt."

### Dashboard integration

In `Dashboard.tsx` (player view only — admins/coaches already redirect away in the existing `useEffect`):
- Load completions for the active instance once (a single `supabase.from("user_day_completion").select(...)` already happens elsewhere; reuse it or add one scoped query alongside `upsertTodaySnapshot`).
- Pass into `<FlameCard stats={...} />`, mounted near the top of the player section.
- Detect `completedToday` flip inside `FlameCard` via a ref to fire the celebration once per session.

### Privacy

- Component renders only on the player dashboard page; nothing is added to Coach or Admin pages.
- No new DB writes, so no new rows that could leak. Coach RLS unchanged.
- No journals/reflections referenced.

### Acceptance / how to test

1. Open player dashboard with no completions → "Startbereit", level ember, streak 0, grid all dim.
2. Complete today's flow → toast fires once, flame pulses, state becomes "saved_today", streak +1.
3. Complete days 1–7 in a row (or seed) → level transitions through Funke → Flamme → Momentum, milestone toasts at 3 and 7.
4. Skip a day, return next day → message becomes "Stark: Rückkehr…", streak honestly resets, longest streak preserved.
5. Coach login → no flame visible anywhere. Admin login → no flame visible.
6. Build + typecheck pass; no new migrations.

### Out of scope (explicitly)

- No streak-freeze / grace mechanic.
- No changes to what counts as a completed day (uses existing `user_day_completion.completion_status === "completed"`).
- No coach aggregate flame view (can be added later under existing aggregate-only privacy rules).
