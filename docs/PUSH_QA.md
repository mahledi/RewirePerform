# Push & Pre-Training QA

RewirePerform has three deliberately separate delivery paths:

- Apple native: APNs via the Capacitor registration token.
- Android native: FCM via the Capacitor registration token.
- Web/PWA: W3C Web Push via VAPID.

A green code or provider-acceptance result is not proof that a notification appeared on a physical lock screen. Each release candidate needs its own real-device check.

## Configuration gates

- APNs needs `APNS_TEAM_ID`, `APNS_KEY_ID`, `APNS_AUTH_KEY` and the correct bundle ID.
- FCM needs `FCM_SERVICE_ACCOUNT_JSON` in the sending Edge Function and the matching ignored `android/app/google-services.json` during the Android native build.
- Web Push needs `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT`.
- Missing configuration disables only that channel. It must never be reported as successfully delivered.
- No credential or provider key is committed to Git.

## What must work

- Morning reminder opens `/dashboard`.
- Pre-training reminder opens `/pre-training`.
- Evening reminder opens `/journal`.
- The V1.4 coach reminder opens `/dashboard?focus=checkin...`.
- APNs nested payloads and FCM flat data payloads preserve the authenticated account boundary.
- Unauthenticated web-notification clicks redirect to login and then return to the original target route.
- Notification logs contain operational delivery state only: type, date, provider acceptance/failure, target URL and safe metadata.
- No payload or log contains journal text, reflection text, questionnaire answers, raw check-in values or psychological labels.

## V1.4 coach-reminder flow

1. Open a coach team with an active program.
2. Confirm that `Heute` and `Letzte 7 Programmtage` are displayed separately.
3. Confirm that automatic focus/visibility refresh keeps existing rows visible and never replaces the dashboard with a full-screen loader.
4. Open `Offene Check-ins erinnern`.
5. Verify the fixed copy contains `sobald wie möglich` and cannot be edited by the coach.
6. Verify the preview distinguishes reachable athletes, athletes without a configured channel and athletes already reminded today.
7. Send once. Confirm that a second campaign for the same team-local day is rejected.
8. Complete one athlete check-in during the preview/send gap and confirm that this athlete is skipped before provider delivery.
9. Confirm on a real iPhone that the APNs notification appears and opens the signed-in athlete's dashboard.
10. Once the FCM configuration gate is complete, repeat on a real Android release build.

Provider acceptance must be described as `an den Push-Dienst übergeben`, never as device delivery.

## Existing scheduled-reminder QA

1. Open a supported production host or native release build.
2. Log in as a QA athlete with an active program.
3. Enable notifications through the explicit user action.
4. Save morning/evening times using both `:00` and `:30` in separate runs.
5. Save pre-training lead time as both 60 and 30 minutes in separate runs.
6. For web, invoke `send-daily-reminder` at the matching half-hour slot.
7. Confirm the operational log and then test the actual lock screen.
8. Tap the notification and verify route, session and account ownership.

## Production cron requirement

Run `send-daily-reminder` every 30 minutes. Hourly execution misses half-hour reminder settings.

## Privacy and retention boundary

- Coach reminder campaigns and push logs contain no private athlete content.
- Push delivery logs and the minimized campaign audit are retained for at most 90 days.
- Account deletion removes the user's push tokens and logs; team deletion removes its campaign audit.
