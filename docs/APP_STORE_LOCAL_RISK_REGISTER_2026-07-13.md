# App Store Local Risk Register - 2026-07-13

Status: Local analysis only. No remote system was changed.

## Release blockers

1. Full Xcode, signing, archive, simulator and real-device verification are unavailable on this Mac.
2. Account deletion and the conflicting 48-hour/30-day retention statements remain blocked by `BD-04`.
3. Minor/guardian and research-consent rules remain blocked by `BD-05`.
4. Production is missing required July tracking migrations. No Production migration is approved.
5. The two SQL function errors need an approved Staging apply, real PostgreSQL post-checks and generated types before any Production proposal.

## Runtime risks requiring a separate behavior-change plan

### Auth user-switch race

`AuthContext` starts deferred role/profile requests without cancelling them when the
session changes. A slow response for the previous account can theoretically update
role or monitoring state after sign-out or a rapid account switch. This is not proven
as a live incident, but it is a real stale-response risk and one of the Hook warnings.

Recommended local patch after approval: make user-context loading request-scoped,
ignore stale responses, clear pending timers on cleanup and add rapid sign-in/sign-out
tests. This changes authenticated behavior and is intentionally not folded into the
current environment/migration block.

### Coach team-load race

The Coach page can apply a delayed team response after the active user changes. The
query still uses the original user ID, but the response writes shared page state.

Recommended local patch after approval: cancel or generation-guard each request and
add a two-user switch test.

### Remaining Hook warnings

Admin, Team Management and Dashboard use render-local async functions from effects.
Dashboard already cancels its initialization path, but the callback graph still needs
focused runtime tests before dependency changes. Adding every dependency mechanically
could create repeated requests and visible loading churn. Ten other warnings are Fast
Refresh module-boundary warnings and do not affect the release bundle at runtime.

## Tracking integrity observation

`save_daily_tracking_v2` accepts only `training`, `rest` and `competition`, but it does
not currently compare `_event_type` with the selected assignment's `context_type`.
The UI and prepared E2E suite send matching values, so normal flows remain correct;
the database does not independently reject an allowed-but-mismatched context.

Any database-side enforcement is a separate migration and remains blocked until its
exact behavior, compatibility impact, rollback and Staging test plan are approved.

## Offline and retry boundary

- Check-in and Journal keep user/run/date-scoped local drafts.
- Failed server saves keep the draft and show a retry message.
- Tracking writes use the atomic `save_daily_tracking_v2` path and are idempotent for a day.
- There is no background queue that automatically syncs a draft after connectivity returns.
- The web service worker falls back to a simple offline response for failed navigation.
- Capacitor bundles the web assets locally, but authenticated data still requires Supabase.

This is adequate for preserving entered text during a transient failure. It is not a
fully offline-capable product and must not be described as one in Store metadata.

## Tooling observations

- `npm audit --omit=dev`: 0 known Production dependency vulnerabilities.
- Full `npm audit`: two Vite/esbuild development-tool findings.
- The automatic audit fix requires a Vite 8 major upgrade and is not release-safe without a separate compatibility block.
- ESLint: 0 errors, 16 warnings.
- Local CI: 64/64 tests passed.
- Browser E2E: 16/16 tests passed.
- Production Capacitor sync: passed.
- Native Staging sync is intentionally unavailable while Staging and Production share one Xcode target and bundle ID.
