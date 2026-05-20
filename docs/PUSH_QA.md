# Push & Pre-Training QA

RewirePerform push is web/PWA-first for launch. Native iOS push is prepared as a later APNs/Capacitor track and must not block App Store V1.

## What Must Work

- Supported production web/PWA hosts can enable push.
- Lovable preview and native iOS WebView show a clear unsupported/prepared state instead of a broken activation button.
- Morning reminder opens `/dashboard`.
- Pre-training reminder opens `/pre-training`.
- Evening reminder opens `/journal`.
- Unauthenticated notification clicks redirect to login and then return to the original target route.
- Notification logs store operational status only: sent/opened/failed/expired, target URL, schedule time, and safe metadata.

## Manual QA Flow

1. Open a supported HTTPS host, preferably `https://rewireperform.com`.
2. Log in as a QA athlete with an active program.
3. Go to settings.
4. Save at least one training day.
5. Enable push and confirm a `push_subscriptions` row exists.
6. Save morning/evening reminder times using both `:00` and `:30`.
7. Save pre-training lead time as both 60 and 30 minutes in separate runs.
8. Invoke `send-daily-reminder` at the matching half-hour slot.
9. Confirm `notification_log.status = 'sent'`.
10. Click the notification and confirm:
    - route opens correctly,
    - existing session is preserved,
    - login return works if signed out,
    - `notification_log.status = 'opened'`.

## Production Cron Requirement

Run `send-daily-reminder` every 30 minutes. Hourly execution will miss half-hour reminders.

## Privacy Boundary

Push logs must never contain journal text, free reflection, raw check-ins, raw questionnaire answers, or individual psychological labels.
