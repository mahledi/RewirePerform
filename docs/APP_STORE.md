# RewirePerform App Store Readiness

RewirePerform ships as a premium Capacitor WebView app: the React/Supabase product remains the runtime core, while iOS provides the App Store shell, icon, splash screen, safe-area handling, and future native capability surface.

## App Identity

```text
App name: RewirePerform
Bundle ID: com.rewireperform.app
Primary domain: https://rewireperform.com
Support URL: https://rewireperform.com/support
Privacy Policy URL: https://rewireperform.com/privacy
Category: Health & Fitness or Sports
Audience: Athletes and coaches using mental performance routines
```

Use performance-safe wording. Do not describe RewirePerform as a diagnosis, medical device, mental-health treatment, therapy replacement, or proof of brain rewiring.

## Build Commands

```bash
npm ci
npm run app:build
npx cap open ios
```

Safe repeatable shortcuts:

```bash
# Build, validate and sync Production without opening Xcode.
npm run app:build

# Build, validate and sync Production, then open Xcode.
npm run app:open:ios
```

Do not sync a Staging web bundle into the current iOS project. The current Xcode
target owns the Production bundle ID `com.rewireperform.app`; native Staging needs a
separately approved bundle ID and scheme.

In Xcode:

1. Use Xcode 26 or newer. Since 28 April 2026, Apple requires iOS submissions to use the iOS 26 SDK or newer.
2. Select the `App` target.
3. Confirm bundle identifier `com.rewireperform.app`.
4. Select the Apple Developer team.
5. Set signing to automatic unless a manual profile is required.
6. Archive with `Any iOS Device (arm64)`.
7. Upload through Organizer to App Store Connect.

If `xcodebuild` reports that only Command Line Tools are active, install/open the full Xcode app and run:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch
```

## Domain And Supabase Checklist

Before TestFlight, configure the production host:

```text
https://rewireperform.com
https://rewireperform.com/auth
https://rewireperform.com/privacy
https://rewireperform.com/support
```

Supabase Auth settings:

```text
Site URL: https://rewireperform.com
Additional Redirect URLs:
- https://rewireperform.com/**
- capacitor://rewireperform.com/**
- com.rewireperform.app://**
```

Keep the Lovable preview URL only as a development/preview origin. Production App Store review should use `rewireperform.com`.

## Reminder Status

Web push already exists:

- Frontend hook: `usePushSubscription`
- Service worker push handlers: `src/sw.ts`
- Supabase tables: `push_subscriptions`, `notification_log`
- Edge Functions: `get-vapid-public-key`, `send-daily-reminder`

The iOS shell uses `@capacitor/local-notifications` instead of browser Web Push. It plans local reminders for the next 56 days, refreshes the plan when the app becomes active, opens only allow-listed app routes, and removes the active account's pending reminders after sign-out/account switches. Web/PWA push remains unchanged on production HTTPS hosts.

Reminder behavior:

- Morning and evening reminders honor saved hour and minute.
- Pre-training reminders honor the selected lead time, currently 30 or 60 minutes before the saved training time.
- Native pre-training reminders use the weekly schedule plus dated calendar overrides. Known rest days suppress the reminder; dated training/competition times take precedence.
- Training weekdays are interpreted in the user's local timezone so a local Monday training remains Monday even when UTC crosses midnight.
- The Supabase schedule should invoke `send-daily-reminder` every 30 minutes for the half-hour slots to be reliable.
- Notification logs store send/open/failure status only; no journal text, private reflections, or psychological raw values are included.
- Native local reminders do not create server `notification_log` delivery/open records. Do not combine local scheduling with measured web-push delivery in evidence claims.

Push QA:

1. Confirm VAPID secrets in Supabase.
2. Open `https://rewireperform.com/settings` in a supported browser.
3. Enable push and verify a `push_subscriptions` row.
4. Save full-hour and half-hour reminder times and verify UTC conversion.
5. Save 30-minute and 60-minute pre-training lead times.
6. Invoke `send-daily-reminder` in a safe test window.
7. Verify one `notification_log` row per user/type/date with `status`, `target_url`, and `scheduled_for`.
8. Click the notification and confirm the target route marks the log as `opened`.
9. Confirm expired subscriptions are removed and logged as `expired_subscription` after send failures.

Native reminder QA on a real iPhone:

1. Grant and deny notification permission in separate clean-install runs.
2. Verify morning and evening local-time delivery.
3. Verify 30- and 60-minute pre-training delivery, including a reminder that falls on the previous day.
4. Verify a rest-day override suppresses pre-training and a timed competition override replaces the weekly time.
5. Tap each notification and confirm `/dashboard`, `/journal`, and `/pre-training` routing.
6. Change the coach/team calendar, foreground the app, and confirm pending reminders are refreshed.
7. Sign out and confirm pending reminders for that account are removed.

## App Privacy Labels Draft

Declare data collection only for actual production behavior.

Likely linked to user identity:

- Contact info: email address
- User content: journal entries, questionnaire free text, feedback messages
- Health/fitness-related app activity: check-ins, training schedule, program completion
- Identifiers: Supabase user ID, push endpoint
- Diagnostics: incident-only system events with normalized error codes and restricted technical metadata
- Health: user-provided mood, stress, recovery, sleep/readiness and assessment data
- Fitness: training schedule and competition context

Purposes:

- App functionality
- Personalization
- Analytics of own progress and privacy-safe team aggregates
- Notifications, if enabled

Tracking:

- No third-party tracking by default.
- Do not add advertising SDKs for V1.

Sensitive handling:

- Coaches must not see private journal text, raw free-text questionnaire answers, individual mood history, or individual Development Index answers.
- Coach views are aggregate/status views only, with privacy thresholds where applicable.

## App Store Metadata Draft

The current source of truth for localized copy, field limits, screenshots, review
notes and unresolved owner/legal fields is
`docs/APP_STORE_CONNECT_PACKAGE_2026-07-13.md`.

## TestFlight Gate

Do not submit for external TestFlight until:

- `npm run ci` passes.
- `npm run app:build` succeeds.
- Xcode build launches in simulator or device.
- `https://rewireperform.com` loads without a black screen.
- Login/session/reload work in native shell.
- `/privacy` and `/support` are reachable.
- App Privacy Labels match real behavior.
- Review demo accounts are working.
- Web push and native local reminders are each verified in their real runtime.
- Account deletion can be initiated in-app and its real retention process matches the privacy policy.
- The minor/guardian and research-consent rule has been legally and operationally approved.

## Known V1 Limitations

- iOS uses local notifications, not APNs remote push. Local delivery/open status is therefore not present in the server `notification_log`.
- Store screenshots and final legal review remain owner tasks.
- Any future brain-tracking/wearable integration must be introduced as a separate, explicit consent-based feature.

## Current Apple Sources

- Submission SDK requirements: https://developer.apple.com/app-store/submitting/
- App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Account deletion: https://developer.apple.com/support/offering-account-deletion-in-your-app/
- App privacy details: https://developer.apple.com/app-store/app-privacy-details/
- Third-party SDK requirements: https://developer.apple.com/support/third-party-SDK-requirements/
