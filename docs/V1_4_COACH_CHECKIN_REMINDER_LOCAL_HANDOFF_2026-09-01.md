# V1.4 Coach Check-in Reminder – local handoff

Status: `TESTED_LOCAL_CANDIDATE`

This document does not authorize a Production migration, Edge deploy, merge, native build or store action.

## Product contract

- The coach sees two separate truths: `Heute` and the shared run-scoped window `Letzte 7 Programmtage`.
- The denominator is derived from the active team's program run, not from each athlete's historical snapshots.
- Once per team-local program day, the coach may trigger one fixed friendly reminder for athletes whose current-day check-in is still open.
- The athlete copy is fixed and contains: `Nimm dir bitte sobald wie möglich kurz Zeit dafür.`
- The coach cannot enter custom text.
- Completion is rechecked immediately before provider delivery.
- UI and API say `an den Push-Dienst übergeben`; they do not claim lock-screen delivery.

## Privacy and access contract

- The coach status RPC returns completion state, counts, dates, reminder state and channel availability only.
- It returns no mood, energy, focus, questionnaire answer, journal, reflection or psychological classification.
- The caller must be allowed to manage the team.
- The claim and finalize RPCs are service-role-only.
- The private campaign audit contains minimized operational counts and is deleted after at most 90 days.
- User deletion removes push tokens and delivery logs. Team deletion removes its campaign audit.

## Delivery contract

- iOS native delivery uses APNs.
- Android native delivery uses FCM HTTP v1 when both build-side Firebase configuration and the Edge secret are present.
- Web delivery uses VAPID Web Push.
- Native delivery is attempted first; Web Push is a fallback when no native provider accepted the request.
- Expired native tokens and web subscriptions are deleted.
- Missing provider configuration is represented as unavailable, not success.

## Dashboard refresh contract

- The initial team load may show a bounded loading state because no safe prior team state exists yet.
- Later interval, focus, visibility and manual status refreshes only request the lightweight check-in RPC.
- Existing rows and counters remain visible during refresh.
- Concurrent refreshes are collapsed.
- A background request is aborted after 12 seconds; failure preserves the last known rows and adds a non-blocking warning.
- The UI does not claim realtime; it refreshes every 60 seconds while visible and on return to the app.

## Activation gates still required

1. Apply the migration to the intended Supabase target and verify Advisors/RLS.
2. Deploy `send-coach-checkin-reminder` with JWT verification.
3. Verify the APNs configuration already used by the release target.
4. For Android FCM, provide the matching service-account secret and ignored `google-services.json`, then create a new Android native build.
5. Perform the physical APNs flow on an iPhone and the physical FCM flow on Android.
6. Only after these gates may the status move from `TESTED_LOCAL_CANDIDATE` to `ACTIVE`.
