# App Store Connect Package - 2026-07-23

Status: Prepared locally and reconciled with the technically validated V1
archive on 28 July 2026. The App Store Connect web form has not yet been
audited in an authenticated browser. No TestFlight build, App Review
submission, or release has been created.

This is the metadata source of truth for the first iOS version. It prepares
the values for controlled entry. Xcode has successfully validated version
`1.0 (1)` against App Store Connect, but that validation does not prove that
every web metadata field is complete. No TestFlight start, submission, or
release is authorized by this document.

## App information

| Field | Draft value | Status |
| --- | --- | --- |
| Name | RewirePerform | Ready, 13/30 characters |
| Bundle ID | `com.rewireperform.app` | Ready in Xcode and signed development builds |
| SKU | `rewireperform-ios-001` | Local recommendation; enter only after upload approval |
| Primary language | German | Ready |
| Primary category | Sports | Ready |
| Secondary category | Health & Fitness | Ready; requires truthful regulated-medical-device declaration |
| Version | 1.0 | Ready in Xcode |
| Build | 1 | Must increase for every upload |
| Copyright | `2026 Mahle Herzog` | Ready for individual developer account |
| Price | Free | Ready |
| Release mode | Manual release | Ready; publication remains separately approval-gated |
| Availability | Public and listed in Germany | Ready as plan, not configured |
| TestFlight | Small internal/external RC test before submission | Ready as plan, not started |
| DSA trader status | Trader assessment and verification required | Legal/owner gate before EU release |
| DSA public contact | Verified address or P.O. Box, phone, and `support@rewireperform.com` | Owner must enter and complete Apple's verification |
| Content rights | RewirePerform-owned or licensed assets only | Final asset/license audit required |
| Intended users | Athletes from age 15; under 16 only with guardian authorization | Product statement, not an Apple rating |
| Age rating questionnaire | Answer from the final RC; no Kids Category | Owner completes after RC freeze; do not guess or force a rating |
| Regulated medical device | No | Ready while final product and claims remain non-medical |
| Scientific/performance claims | No diagnosis or guaranteed outcome; only approved routine/performance wording | Ready for RC copy, legal review still required |

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
- Privacy Choices: omit for 1.0; Apple marks this URL optional and the signed-in
  privacy choices remain available in Settings

The three public URLs must be rechecked against the frozen RC immediately before
upload. Prior availability checks prove technical reachability, not legal
completeness.

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

Access model:
- Public registration creates athlete accounts only.
- Coach access is manually verified and approved by the operator.
- Users under 16 require guardian authorization and their own assent before program access.

Privacy boundaries:
- Coaches can see participation/status information and privacy-safe team aggregates.
- Coaches cannot see private journal text, free personal reflections, raw questionnaire answers, or individual psychological scores.
- The supplied accounts contain synthetic data only.

Additional demo accounts:
Coach: [email] / [password]
Admin: [email] / [password]

Suggested review path:
1. On first launch, review the three introductory pages, then sign in with the Athlete account.
2. Open Dashboard and inspect the current program day.
3. Open Daily Check-in and Journal. The questions adapt to training, competition, or rest-day context.
4. Open Settings. Local notifications and on-device speech input are optional. Typing remains available if microphone or speech permission is denied.
5. Sign out and use the Coach account to inspect team status and aggregate-only views.
6. Use the Admin account only to verify the protected manual coach approval area.
7. Open Settings > Konto & Daten > Account löschen.

No purchase is required. The app uses standard HTTPS/TLS only and declares no non-exempt encryption in Info.plist.
```

The in-app deletion path is implemented. Before upload, the frozen RC still needs
the planned synthetic athlete and coach deletion matrix, including team integrity,
revocation, and residual-reference checks. No real user, including Farin, may be
used for destructive testing.

Review contact requires a real name, monitored email and reachable phone number.

## Screenshot package

Apple currently allows one to ten screenshots. RewirePerform supports both iPhone and
iPad, so prepare both required sets from the final native build:

- iPhone 6.9-inch portrait: use an accepted native size, preferably the installed
  simulator's exact output such as 1290 x 2796 or 1320 x 2868 pixels.
- iPad 13-inch portrait: 2064 x 2752 or 2048 x 2732 pixels.
- Capture the same six scenes in the same order for both device families.

The native V1 build and both physical device families are green. Screenshot
capture remains open because it requires a clean synthetic review state and
the final Store localization.

Planned scenes for the primary athlete listing:

1. `Heute`: current real program day and next action.
2. `Plan`: weekly strip and daily timeline with real calendar context.
3. Daily check-in: sport-neutral questions and practical tasks.
4. Private journal: structured reflection without identifiable content.
5. `Entwicklung`: real program adherence, phases, streak and applications
   without psychological scores or unsupported efficacy claims.
6. `Mehr`: privacy, optional reminders, support and account controls.

If a separate coach-focused scene is used, it may contain only synthetic
status and privacy-safe aggregate data. It must not replace the coherent
athlete story in the primary screenshot set.

Capture rules:

- Use synthetic App Review accounts only.
- No email address, access code, private journal text or identifiable athlete data.
- Capture the real native app without Safari/browser chrome.
- Export `.png`, `.jpg`, or `.jpeg` without an alpha channel.
- Use one consistent locale, time, appearance and content state per set.
- Check every final image for clipping, keyboard remnants, permission dialogs, loading
  spinners and stale data.
- Do not generate screenshots until the final native build and device QA are green.

## Privacy and compliance answers

- `ITSAppUsesNonExemptEncryption`: `false` is already present in `Info.plist`.
- App Tracking Transparency: not required while no cross-app advertising tracking,
  IDFA, data broker or ad measurement exists.
- Privacy labels: Name, Email Address, User ID, Health, Fitness, Other User
  Content, Customer Support, Product Interaction, and Other Diagnostic Data are
  linked to the account where applicable. `Crash Data` is absent because the RC
  contains no crash collector. Tracking is `false`.
- Account deletion: implemented; final synthetic athlete/coach residual-reference
  matrix and provider-retention review remain release gates.
- Minor/guardian and optional Evidence consent: technically implemented and
  practically exercised; rejection, expiry, resend, revocation, and stale-policy
  cases remain in the final RC matrix. External legal review remains mandatory
  before manual public release.
- Health/mental-performance claims: no diagnosis, treatment, guaranteed
  effectiveness, or medical-device claim.
- Regulated Medical Device declaration: `No`, subject to the unchanged
  non-medical RC and the final owner/legal confirmation.
- DSA: Germany distribution requires the account holder to complete the trader
  assessment. If declared as a trader, Apple requires a verified public address
  or P.O. Box, phone number, and email for the individual account.

## Explicit approval boundaries

- No App Store Connect app record, build upload, TestFlight group, privacy-answer
  publication, App Review submission, or manual release without a separate owner
  approval for that exact step.
- Public release remains blocked until the focused external legal review of
  minors, tracking/Evidence, privacy, retention, and DSA trader details is
  complete.

## Official references verified 2026-07-23

- https://developer.apple.com/help/app-store-connect/reference/app-information/app-information
- https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/
- https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/
- https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating
- https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/
- https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/
- https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app/
- https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/select-an-app-store-version-release-option/
