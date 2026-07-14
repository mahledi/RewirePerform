# App Store Connect Package - 2026-07-13

Status: Prepared locally. Not entered in App Store Connect. Not submitted.

This is the metadata source of truth for the first iOS version. Text marked
`BLOCKED` or `OWNER INPUT` must be resolved before any upload or submission.

## App information

| Field | Draft value | Status |
| --- | --- | --- |
| Name | RewirePerform | Ready, 13/30 characters |
| Bundle ID | `com.rewireperform.app` | Ready in Xcode; Apple record not verified |
| SKU | `rewireperform-ios-001` | OWNER INPUT before app record creation |
| Primary language | German | Recommendation |
| Primary category | Sports | Recommendation |
| Secondary category | Health & Fitness | Recommendation |
| Version | 1.0 | Ready in Xcode |
| Build | 1 | Must increase for every upload |
| Copyright | `2026 [legal owner name]` | OWNER INPUT |
| Price | Free for controlled pilot | OWNER INPUT |
| Release mode | Manual release | Recommended safety default |
| Distribution | Internal TestFlight first | Ready as plan, not configured |
| DSA trader status | `[select and verify]` | OWNER/LEGAL INPUT |
| Content rights | `[confirm ownership/licences]` | OWNER INPUT |
| Age rating questionnaire | `[complete after BD-05]` | BLOCKED |
| Regulated medical device | No, if final product/claims remain non-medical | OWNER/LEGAL CONFIRMATION |

## German localization

Subtitle, 25/30 characters:

```text
Mentale Routinen im Sport
```

Promotional text, 124/170 characters:

```text
Dein strukturiertes 56-Tage-Programm für mentale Routinen, Check-ins und Reflexion rund um Training, Wettkampf und Ruhetage.
```

Keywords, 89/100 UTF-8 bytes:

```text
mentaltraining,athlet,sport,training,fokus,routine,journal,reflexion,coach,team,wettkampf
```

Description:

```text
RewirePerform begleitet Athletinnen und Athleten durch ein strukturiertes 56-Tage-Programm für mentale Routinen im Sport.

Jeder Programmtag verbindet kurze Impulse mit praktischen Aufgaben, einem kontextbezogenen Check-in und persönlicher Reflexion. Die Inhalte passen sich daran an, ob Training, Wettkampf oder Ruhetag geplant ist. So bleibt der Ablauf für verschiedene Sportarten nutzbar, ohne eine sportliche Situation zu erfinden, wenn keine stattgefunden hat.

Funktionen:
• Tagesplan für 56 Tage
• Check-ins für Training, Wettkampf und Ruhetag
• Privates Journal und Reflexion
• Vorbereitung vor Training und Wettkampf
• Persönlicher Fortschritt
• Optionale lokale Erinnerungen
• Team- und Coach-Bereiche mit status- und aggregatbasierten Einblicken

Private Journaltexte und freie persönliche Antworten bleiben für Coaches verborgen. RewirePerform ist kein medizinisches Produkt, stellt keine Diagnose und ersetzt keine medizinische oder psychotherapeutische Behandlung.

Für die Nutzung ist ein Konto erforderlich.
```

URLs:

- Privacy Policy: `https://rewireperform.com/privacy`
- Support: `https://rewireperform.com/support`
- Marketing: `https://rewireperform.com`
- Privacy Choices: `[final route required]` - BLOCKED until consent/deletion wording is final

The Support URL must be rechecked for all legally required contact information before
submission. A working email alone may not satisfy every market's legal requirements.

## App Review information

Primary username/password fields:

```text
Athlete username: [non-expiring synthetic review account]
Athlete password: [provide only in App Store Connect]
```

Review notes draft:

```text
RewirePerform is a mental-performance routine and reflection app for athletes across sports. It is not a medical, diagnostic, or treatment app. All core functionality requires sign-in.

Privacy boundaries:
- Coaches can see participation/status information and privacy-safe team aggregates.
- Coaches cannot see private journal text, free personal reflections, raw questionnaire answers, or individual psychological scores.
- The supplied accounts contain synthetic data only.

Additional demo accounts:
Coach: [email] / [password]
Admin: [email] / [password]

Suggested review path:
1. Sign in with the Athlete account.
2. Open Dashboard and inspect the current program day.
3. Open Daily Check-in and Journal. The questions adapt to training, competition, or rest-day context.
4. Open Settings. Local notifications and speech input are optional. Typing remains available if microphone or speech permission is denied.
5. Sign out and use the Coach account to inspect the team status and aggregate-only views.
6. Open Settings > [FINAL ACCOUNT DELETION PATH].

No purchase is required. The app uses standard HTTPS/TLS only and declares no non-exempt encryption in Info.plist.
```

The deletion path in step 6 is deliberately unresolved. Do not submit with that
placeholder or with the current request-only deletion flow.

Review contact requires a real name, monitored email and reachable phone number.

## Screenshot package

Apple currently allows one to ten screenshots. RewirePerform supports both iPhone and
iPad, so prepare both required sets from the final native build:

- iPhone 6.9-inch portrait: use an accepted native size, preferably the installed
  simulator's exact output such as 1290 x 2796 or 1320 x 2868 pixels.
- iPad 13-inch portrait: 2064 x 2752 or 2048 x 2732 pixels.
- Capture the same six scenes in the same order for both device families.

Planned scenes:

1. Athlete dashboard with the current 56-day program context.
2. Training-day check-in with sport-neutral language.
3. Rest-day reflection showing that no sports action is invented.
4. Competition preparation with concise instructions.
5. Personal progress view without unsupported efficacy claims.
6. Coach team view containing synthetic status/aggregate data only.

Capture rules:

- Use synthetic App Review accounts only.
- No email address, access code, private journal text or identifiable athlete data.
- Capture the real native app without Safari/browser chrome.
- Use one consistent locale, time, appearance and content state per set.
- Check every final image for clipping, keyboard remnants, permission dialogs, loading
  spinners and stale data.
- Do not generate screenshots until the final native build and device QA are green.

## Privacy and compliance answers

- `ITSAppUsesNonExemptEncryption`: `false` is already present in `Info.plist`.
- App Tracking Transparency: not required while no cross-app advertising tracking,
  IDFA, data broker or ad measurement exists.
- Privacy labels: use the categories documented in `APP_STORE_PRIVACY_READINESS.md` and
  reconcile them against Xcode's Privacy Report before submission.
- Account deletion: BLOCKED by `BD-04`.
- Minor/guardian and research consent: BLOCKED by `BD-05`.
- Health/mental-performance claims: final owner/legal review required.

## Official references verified 2026-07-13

- https://developer.apple.com/help/app-store-connect/reference/app-information/app-information
- https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/
- https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
- https://developer.apple.com/app-store/review/
- https://developer.apple.com/app-store/review/guidelines/
