# V1.1 Co-Coach invitation and observation readiness

Stand: 14. August 2026

## Product decision

The Co-Coach invitation uses the same user model as the athlete invitation:

1. A lead coach creates one current team-specific Coach code.
2. RewirePerform builds the canonical HTTPS route
   `/organization/invite?coach=<CODE>`.
3. WhatsApp, native share and link copy use that same route.
4. iOS Universal Links open the installed app. Without the app, the web route
   opens the same Coach introduction and registration path.
5. The code remains in the preserved redirect and is visibly prefilled on the
   acceptance screen.
6. Acceptance is explicit and server-side. It grants the normal active Coach
   and Co-Coach team memberships; the visual role choice never grants access.

The previous 64-character, email-bound organization invitation remains valid
for existing admin/organization workflows. The normal lead-coach Co-Coach UI no
longer creates that legacy invitation.

## Security and minimization

- Codes contain 80 bits of random entropy, are one-time and expire after seven
  days.
- Only a SHA-256 digest is stored in `app_private`.
- Direct access is revoked from `PUBLIC`, `anon`, `authenticated` and
  `service_role`; calls are limited to narrow authenticated RPCs with a fixed
  `search_path`.
- Creating a replacement revokes the previous pending code.
- Acceptance requires a confirmed authenticated account. Existing athlete
  accounts containing athlete or minor-authorization data are not silently
  converted.
- The digest is deleted immediately on acceptance. A daily retention job
  deletes expired or replaced codes after expiry.

## Coach data boundary

Team activity and the entering coach's own individual structured observation
are operational team functions. The individual observation is available for
each active athlete in the current team run and is no longer filtered by the
athlete's voluntary evidence-contribution status.

This does not broaden the Coach view into athlete-private content:

- no journal or reflection text;
- no free answers or product-feedback comments;
- no raw questionnaire answers;
- no individual mood, energy or focus values;
- no individual psychological scores or private development labels.

The observation contains exactly five structured ratings of directly visible
sport behaviour, has no required free text, can be reopened only by the entering
coach and stays outside website, AI, standard and external evidence exports.
Athlete evidence pulses, team Evidence and aggregates keep their existing
consent and minimum-group-size gates.

## Readiness statement

The V1.1 flow is bounded to structured operational team data and the existing
minor/guardian controls. Jarvis may use the already authorized structured data
paths, but athlete free text remains closed to Jarvis and other machine
consumers. Activating a future free-text path is outside V1.1 and requires its
own review.

An additional external legal review is not a technical release gate for this
bounded V1.1 flow. The final App Store privacy labels and public notice must
still match the exact activated data flow. Technical verification is evidence
of the implemented boundary, not legal advice.

## Local Build 7 and external read-only evidence

- Version `1.1`, build `7` is pinned in both Xcode configurations.
- The complete production-targeted `app:build` passed: 160 test files and 905
  tests, the SQL contract suites, App Store static verification, Capacitor sync
  and the embedded Production-project check.
- Xcode readiness passed 10/10 including signing identities and Developer Team;
  the unsigned native Simulator build passed 9/9.
- App Store Connect was inspected read-only on 14 August 2026. TestFlight still
  contains only version `1.1`, build `6`, in the internal group. No build `7`
  has been uploaded and no Store version `1.1` exists.
- Production migration `20260814121023_coach_invite_code_and_observation_access_v1_1`
  was applied from merge SHA `456495b260b710837d858c1368bcdbe5e1057083`.
  Its code table, RPC boundaries and daily retention job were verified after
  apply. Feedback collection, text collection and machine Production export
  remained closed. `pg_cron` and `pgcrypto` are installed.

The Production apply and merge are covered by this evidence. Web deployment,
archive upload and App Store Connect mutation remain separate evidence steps.
