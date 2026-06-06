# Coach Dashboard — Mobile UI Refactor

Scope: UI/UX only. No backend, auth, data, or logic changes. Desktop layout preserved.

## 1. New mobile navigation model (`src/pages/Coach.tsx`)

- Detect mobile with existing `useIsMobile()` hook.
- Desktop (≥768px): keep current 5-tab bar exactly as is.
- Mobile (<768px): replace tab bar with a **vertical card home screen**:
  - Premium header: larger "Trainer Dashboard" title, short subtitle, sign-out icon.
  - Full-width team selector (if >1 team) below header.
  - 5 stacked tappable cards (Übersicht, Mental, Wirksamkeit, Toolkit, Teams) — each with icon tile, title, one-line description, chevron, `active:scale-[0.98]`, subtle primary ring on hover.
- When a card is tapped, the section view replaces the home view (same `tab` state). On mobile, render a sticky sub-header with:
  - Back chevron → returns to card home (sets `tab` to a new `"home"` sentinel for mobile only).
  - Section title + subtitle.
- Add `overflow-x-hidden` on the page root and `min-w-0` on all flex/grid children that hold dynamic content.

## 2. New reusable component

- `src/components/coach/MobileNavCard.tsx`: icon, title, description, chevron, rounded-2xl, `border-border/50`, `bg-card`, subtle `hover:border-primary/30 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]`, press feedback. Used only on mobile home.
- `src/components/coach/MobileSectionHeader.tsx`: back button + title + subtitle, sticky under main header on mobile.

## 3. Section components — mobile audit

Each file gets responsive cleanup. No data/logic changes.

**`TeamOverview.tsx`**
- Stat grid: `grid-cols-2 md:grid-cols-4` with `min-w-0`, wrap long numbers, truncate names.
- Empty states centered with adequate padding.

**`TeamMentalState.tsx`**
- Wrap all Recharts in `ResponsiveContainer` with `width="100%"` and a fixed height; parent gets `w-full min-w-0 overflow-hidden`.
- Multi-column metric rows → `grid-cols-1 sm:grid-cols-2`.
- Shorten/abbreviate long axis labels on mobile or rotate.
- Ensure no fixed pixel widths exceed 320px.

**`TeamEvidence.tsx`** (highest overflow risk)
- Replace any `<table>` with stacked cards on mobile (`md:hidden` card list + `hidden md:table` table), each card showing label/value pairs vertically.
- Remove any `overflow-x-auto` wrappers; use vertical stacking instead.

**`TeamManagement.tsx`**
- Action buttons: `flex-col sm:flex-row`, full-width on mobile.
- Access codes in `break-all` containers, copy button below on mobile.
- Team name `truncate` with title attr; long descriptions wrap.

**`CoachToolkit.tsx`** (already mostly fine)
- Verify all `<select>` and journal textareas are `w-full`; section header row already stacks. Minor spacing tweaks only if needed.

## 4. Global mobile rules applied across all five files

- Root containers: `w-full min-w-0`.
- Remove every `overflow-x-auto`/`whitespace-nowrap` that causes horizontal scroll; replace with wrap or vertical stacking.
- Use existing semantic tokens (`bg-card`, `border-border/50`, `text-primary`, etc.) — no hardcoded colors.
- Padding: `px-4 sm:px-5 md:px-6`, generous vertical breathing room (`space-y-4` / `space-y-5`).
- Tap targets ≥ 44px height.

## 5. Verification

- View `/coach` at 375px, 390px, 414px viewports → no horizontal scroll, vertical card home renders, each section opens with back button.
- View at 1280px → original tab UI unchanged.
- Build passes, no TS errors.

## Technical details

- New mobile state: extend `Tab` type to `"home" | "overview" | "mental" | "evidence" | "toolkit" | "manage"`. Default to `"home"` on mobile, `"overview"` on desktop. When `isMobile` flips, normalize accordingly via `useEffect`.
- Conditional render: `{isMobile && tab === "home" ? <MobileHome/> : <SectionView/>}`.
- Back button only shown on mobile when `tab !== "home"`.
- No changes to `fetchTeams`, role routing, or any Supabase calls.

## Files touched

- `src/pages/Coach.tsx` (refactor render tree, add mobile branch)
- `src/components/coach/MobileNavCard.tsx` (new)
- `src/components/coach/MobileSectionHeader.tsx` (new)
- `src/components/coach/TeamOverview.tsx` (responsive cleanup)
- `src/components/coach/TeamMentalState.tsx` (chart + grid responsiveness)
- `src/components/coach/TeamEvidence.tsx` (table → mobile cards)
- `src/components/coach/TeamManagement.tsx` (button/code stacking)
- `src/components/coach/CoachToolkit.tsx` (minor spacing only if needed)
