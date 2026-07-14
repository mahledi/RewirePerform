# TestFlight and Device QA - 2026-07-13

Status: Prepared locally. Xcode is missing. No build was signed or uploaded.

## Release order

1. Install and initialize full Xcode 26 or newer.
2. Close the blocking product/legal decisions and approved backend gates.
3. Run local simulator/device QA from a Production-validated native bundle.
4. Archive version 1.0 with a new build number.
5. Upload to App Store Connect only after explicit approval.
6. Start with internal TestFlight testers.
7. Invite external pilot testers only after the internal matrix is green. The first
   external build requires TestFlight App Review.
8. Submit the App Store version separately and use manual release.

Do not upload a Staging-target bundle under `com.rewireperform.app`. Native Staging
requires a separate bundle ID and Xcode scheme. The current repository helpers always
restore and verify Production before syncing or opening the iOS project.

## Build evidence

Record for every candidate:

- Git commit SHA
- Version and build number
- `npm run app:build` result
- Embedded Supabase ref validation result
- Xcode version and iOS SDK
- Signing team and distribution certificate
- Archive validation result
- Privacy Report path
- Tester account IDs, never passwords
- Device model, OS version and result for every QA row

## Minimum device matrix

| Device | Runtime | Purpose |
| --- | --- | --- |
| Physical iPhone | Current supported iOS | permissions, notifications, lifecycle, voice, network changes |
| iPhone 6.9-inch simulator | Current iOS | layout and App Store screenshots |
| iPad 13-inch simulator/device | Current iPadOS | required iPad layout and screenshots |
| Oldest supported runtime | iOS 15 if retained | deployment target compatibility |

The Xcode project currently declares iOS 15.0 and supports iPhone plus iPad. If iOS 15
cannot be meaningfully tested, raising the deployment target is an explicit product
decision rather than a silent build change.

## Clean-install matrix

- Install, launch and first paint without blank/black screen.
- Sign up, email confirmation/deep link and first sign-in.
- Existing Athlete, Coach and Admin sign-in.
- Session restore after force quit and device restart.
- Sign out, account switch and no previous-user role/team data.
- Deny and allow microphone permission; typing always remains usable.
- Deny and allow speech recognition; no stuck listening state.
- Deny and allow notifications; settings reflect the real permission state.
- Open Privacy and Support from authentication and settings.
- Initiate full account deletion through the final approved in-app path.

## Athlete matrix

- Training day: context copy, pulse questions, tasks, comprehension, save and retry.
- Rest day: no invented action; rest-specific check-in and journal prompts.
- Competition day: concise tasks and competition-specific pulse questions.
- Calendar override changes today's context correctly after foregrounding.
- Check-in save creates one check-in/completion set and retry remains idempotent.
- Journal text survives force quit and failed network save, then clears after success.
- Questionnaire draft survives interruption and completion is not duplicated.
- Progress belongs to the active program instance only.
- Voice input never stores an audio recording in the app.

## Coach and Admin matrix

- Coach can access assigned teams and cannot access an unrelated team.
- Coach sees status/aggregate data but no private journal/reflection/raw score.
- Group values below the approved threshold remain suppressed.
- Admin routes reject Athlete and Coach accounts.
- Evidence/readiness pages handle empty, loading, error and valid states.
- Rapid sign-out/account switch does not show stale role or team state.

## Notifications

- Morning and evening reminders fire in local time.
- 30- and 60-minute pre-training reminders fire at the expected time.
- Reminder crossing midnight lands on the correct calendar day.
- Rest day suppresses pre-training reminder.
- Timed competition override replaces the weekly training time.
- Taps open only allow-listed routes.
- Foregrounding after a calendar change refreshes pending reminders.
- Sign-out/account switch removes the previous account's pending reminders.

## Network and lifecycle

- Launch online, then lose network during Check-in and Journal save.
- Confirm local draft message and manual retry after reconnection.
- Confirm the app never claims that unsynced data reached the server.
- Background/foreground during an in-flight save does not duplicate data.
- Force quit during loading and during draft editing.
- Slow and failed Supabase responses show recoverable UI rather than endless loading.

## Accessibility and visual QA

- VoiceOver labels and focus order for auth, tabs, forms and icon buttons.
- Dynamic Type at large accessibility sizes without clipped text.
- Light/dark appearance if both are exposed.
- Portrait and landscape on iPhone; all declared iPad orientations.
- Keyboard open/close, safe areas, status bar and home indicator.
- No horizontal overflow, occluded controls or unreachable save action.

## Exit criteria

- No P0/P1 defect open.
- No privacy boundary failure.
- No data loss or cross-account state leak.
- All three day contexts pass on the physical iPhone.
- Notification matrix passes on the physical iPhone.
- Review accounts are non-expiring and contain only synthetic data.
- Privacy Report, privacy labels, metadata and live URLs agree with actual behavior.
- Explicit approval exists for upload; a separate explicit approval exists for App
  Store submission.
