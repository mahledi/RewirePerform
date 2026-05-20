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
npm run typecheck
npm run build
npm test
npx cap sync ios
npx cap open ios
```

Recommended repeatable shortcut:

```bash
npm run app:build
npm run app:open:ios
```

In Xcode:

1. Select the `App` target.
2. Confirm bundle identifier `com.rewireperform.app`.
3. Select the Apple Developer team.
4. Set signing to automatic unless a manual profile is required.
5. Archive with `Any iOS Device (arm64)`.
6. Upload through Organizer to App Store Connect.

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

## Push Status

Web push already exists:

- Frontend hook: `usePushSubscription`
- Service worker push handlers: `src/sw.ts`
- Supabase tables: `push_subscriptions`, `notification_log`
- Edge Functions: `get-vapid-public-key`, `send-daily-reminder`

For App Store V1, push is optional and should not block launch. Native iOS WebView push support is not equivalent to browser Web Push. If web push is not reliable inside the native shell, keep notification settings visible only where supported and schedule native push as a follow-up.

Push QA:

1. Confirm VAPID secrets in Supabase.
2. Open `https://rewireperform.com/settings` in a supported browser.
3. Enable push and verify a `push_subscriptions` row.
4. Save reminder times and verify UTC conversion.
5. Invoke `send-daily-reminder` in a safe test window.
6. Verify one `notification_log` row per user/type/date.
7. Confirm expired subscriptions are removed after send failures.

## App Privacy Labels Draft

Declare data collection only for actual production behavior.

Likely linked to user identity:

- Contact info: email address
- User content: journal entries, questionnaire free text, feedback messages
- Health/fitness-related app activity: check-ins, training schedule, program completion
- Identifiers: Supabase user ID, push endpoint
- Diagnostics: only if crash/error tooling is later added

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

Subtitle:

```text
Mental Performance für Sportler
```

Short description:

```text
RewirePerform hilft Sportlern, mentale Routinen, Reflexion, Check-ins und Team-Aggregate strukturiert über ein 56-Tage-Programm zu nutzen.
```

Keywords:

```text
sport, athlete, mental performance, training, journal, focus, coach, team, routine, reflection
```

Review notes:

```text
RewirePerform is a mental performance and reflection app for athletes and coaches. It is not a medical or diagnostic app. Coaches see aggregate/status information only and do not see private journal text or raw individual mental-state answers.

Demo accounts:
Admin: [provide email/password]
Coach: [provide email/password]
Athlete: [provide email/password]

Recommended review path:
1. Log in as Athlete.
2. Open Dashboard.
3. Complete or inspect daily check-in/journal.
4. Open Settings to inspect optional reminders.
5. Log in as Coach to inspect privacy-safe team dashboard.
```

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
- Push is either verified or explicitly marked as post-launch/native-follow-up.

## Known V1 Limitations

- Push is prepared and web-tested, but native iOS push may require a dedicated Capacitor push implementation.
- Store screenshots and final legal review remain owner tasks.
- Any future brain-tracking/wearable integration must be introduced as a separate, explicit consent-based feature.
