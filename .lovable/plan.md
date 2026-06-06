# Admin Dashboard — Mobile UI Refactor

Mirror the Coach mobile pattern in `src/pages/Admin.tsx`. UI only — no changes to data fetching, RPC calls, exports, feedback logic, or any section content.

## Goal

On mobile (<768px), replace the cramped 9-tab strip with a calm vertical card home. Tapping a card opens that section full-width with a back button. Desktop layout stays exactly as it is today.

## Approach

1. **Controlled Tabs**: Convert `<Tabs defaultValue="overview">` to `<Tabs value={tab} onValueChange={setTab}>` with `const [tab, setTab] = useState<string>(isMobile ? "home" : "overview")`. All existing `<TabsContent value="...">` blocks remain untouched.

2. **Mobile detection**: Use existing `useIsMobile()` hook. Normalize tab once on first render based on device (same `didInitDevice` pattern from `Coach.tsx`) so user choice is preserved when resizing.

3. **Header (mobile)**: Compact version of the current header.
   - Title "Admin" + tiny uppercase subtitle "Control Center".
   - Action row collapses: a single overflow row with refresh + sign-out as 36px icon buttons. Links to `/admin/content` and `/admin/qa` move down into the mobile card grid as their own nav cards.
   - Desktop header unchanged.

4. **Section meta array** (mirrors Coach `SECTIONS`):
   - overview → "Übersicht" / "Aggregierte Programm- und Systemkennzahlen."
   - days → "Tage" / "Spieler-Vorschau jedes Programmtags."
   - teams → "Teams" / "Aggregierte Teamdaten, keine Einzelspieler."
   - evidence → "Wirksamkeit" / "Pre/Mid/Post-Veränderungen."
   - presentation → "Präsentation" / "Kennzahlen für Stakeholder."
   - study → "Study" / "Launch-Study-Übersicht und Snapshots."
   - feedback → "Feedback" / "Nutzerfeedback prüfen und beantworten."
   - exports → "Exporte" / "CSV/JSON Datenexporte."
   - health → "Systemstatus" / "Systemgesundheit und Launch-Ops."
   - Plus two link-cards (mobile only): "Content offline" → `/admin/content`, "QA Test Lab" → `/admin/qa`.

5. **Mobile rendering branch**:
   - When `isMobile && tab === "home"`: render hero ("Admin Control Center" / privacy disclaimer) + vertical stack of `MobileNavCard`s. Hide `<Tabs>` entirely.
   - When `isMobile && tab !== "home"`: render a sticky sub-header with back chevron ("Dashboard") + section title/description, then render the existing `<Tabs>` with `TabsList` visually hidden (`className="hidden"`) and the active `<TabsContent>` shown via Radix's controlled value. No content components are modified.
   - Desktop: render the existing `<TabsList>` + `<TabsContent>` exactly as today.

6. **New shared component**: reuse the visual language of Coach's `MobileNavCard`. Either:
   - extract `src/components/coach/MobileNavCard.tsx` into `src/components/MobileNavCard.tsx` and re-import from both pages, OR
   - define a small inline `MobileNavCard` in `Admin.tsx` (same styling). Pick extraction so we have one source of truth.

7. **Overflow hygiene** (mobile only, presentation-only):
   - Page root gets `overflow-x-hidden`.
   - Existing tables inside `TabsContent` already sit in `overflow-x-auto` wrappers — leave them as-is (no logic touched), they remain horizontally scrollable on small screens which is acceptable for dense admin tables.
   - Stat grids keep `grid-cols-2 md:grid-cols-4` (already responsive).

## Files touched

- `src/pages/Admin.tsx` — controlled Tabs, mobile branch with card home + back header, mobile-friendly header actions.
- `src/components/MobileNavCard.tsx` (new) — extracted shared card.
- `src/pages/Coach.tsx` — swap local `MobileNavCard` for the shared import (no visual change).

## Out of scope

- No changes to `loadAll`, RPC names, CSV/JSON export functions, feedback update flow, snapshot creation, or any `TabsContent` children.
- No changes to `AdminContent`, `AdminQA`, or any admin sub-page.
- Desktop layout untouched.

## Verification

- `/admin` at 390px: card home renders, header is compact, tapping a card opens that section, back button returns to home, no horizontal page scroll.
- `/admin` at 1280px: identical to current (9-tab strip, full header).
- `/coach` at 390px: still works (shared `MobileNavCard` import).
- Build passes; no TS errors; no removed imports.
