# App Store post-signup and team-invite release gate

Date: 2026-08-01

Base: `origin/main` `43b44a861b6156a8e7cb8abfb73de8350aeece42`

Candidate branch: `codex/app-store-post-signup-invite-20260731`

## Candidate behavior

- The ten-step athlete introduction is no longer public or pre-auth. It starts
  after email verification and the existing product/minor authorization gate,
  immediately before the existing questionnaire.
- Coaches, admins and returning athlete logins do not receive the signup
  introduction. A deliberately opened Settings replay remains separate.
- A canonical team invitation uses
  `https://rewireperform.com/join?team=ABC123`. The same path is registered as
  an iOS Universal Link and has a safe web fallback.
- A requested team membership is queued until product authorization is active.
  The client then calls one dedicated join helper. The database function also
  performs the authorization check, so a modified client cannot bypass it.
- Failed joins have a visible retry and an explicit `Ohne Team fortfahren`
  path. Queued state is user-scoped, revisioned and resilient to stale local or
  session storage markers.

## Verified candidate evidence

- Focused Auth, native return, team invite, team join and onboarding suite:
  66/66 tests passed after the final persistence/race fixes.
- Full `npm run app:build`: 93/93 test files and 521/521 tests passed.
- Production web/PWA build, all repository SQL/privacy/access/deletion gates,
  App Store static checks, Capacitor iOS sync and embedded Production target
  verification passed for Supabase `bqsbxesmybthwtxmowfz`.
- App Store public Playwright matrix: 50/50 scenarios passed on desktop,
  iPhone portrait/landscape and iPad portrait/landscape.
- Changed TypeScript/TSX files contain no new ESLint warning. The unchanged
  `TeamManagement` hook warning already exists on the base commit.

This is local candidate evidence. It does not prove Production activation,
physical-device behavior, TestFlight acceptance or App Review approval.

## Database activation gate

The candidate migration is:

`20260801104717_harden_team_join_minor_authorization.sql`

It was applied to Production `bqsbxesmybthwtxmowfz` on 2026-08-02. It replaces
`public.join_team_by_code(text)` with a fail-closed check for an active,
non-revoked product authorization before any team lookup or membership write.

The repository history is synchronized with the Production versions
`20260723151225`, `20260723154047` and `20260723165153`. The latter two files
were recovered byte-identically from their documented supervised Production
activation commit. Immediately after the controlled apply, local and remote
migration history matched completely and a second dry-run reported the remote
database as up to date. The live function was verified with a fixed
`search_path`, no `anon` execution, authenticated-only execution, active and
non-revoked product-authorization checks, and a row lock on the authorization.

## Remaining release gates

1. Merge the independently reviewed candidate, verify GitHub CI and the exact Vercel
   Production deployment including the `/join` Universal-Link file.
2. Install that exact build number on iPhone and iPad and test adult, 16-17,
   under-16 guardian accept/decline, returning athlete, coach, invite cold/warm,
   interrupted signup and offline cold start.
3. Replace App Store screenshot slot 8 for both device families with the real
   Auth Solo/Team choice.
4. Create, validate and upload the signed archive; run internal TestFlight QA.
5. Bind the final build and reviewer accounts/notes in App Store Connect, then
   submit only after the final human freeze decision.
