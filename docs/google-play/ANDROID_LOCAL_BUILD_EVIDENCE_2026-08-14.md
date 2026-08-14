# RewirePerform 1.1 — lokale Android-Build-Evidence

Stand: 14. August 2026
Scope: lokaler, credentialfreier Build; kein Signing-Key, kein Play-Upload,
kein Console-Write und kein Geräte-Smoke

## Identität

- Basis-SHA: `997162b85d6982e318cbbcb5ba894d390b491720`
- Branch: `codex/android-v1-1-review-ready-20260814`
- Package: `com.rewireperform.app`
- `versionName`: `1.1`
- `versionCode`: `1`
- `minSdk` / `compileSdk` / `targetSdk`: `24 / 36 / 36`
- Capacitor: `8.4.1`
- eingebettetes Production-Ziel: `bqsbxesmybthwtxmowfz`

## Grüne Gates

- `npm ci`: 838 Pakete installiert, Audit 0.
- `npm audit --omit=dev`: 0 Schwachstellen.
- `npm run ci`: 160 Testdateien, 897 Tests, alle grün.
- `npm run app:build:android`: Production-Target, Capacitor-Sync,
  eingebettetes Android-Target und statische Android-Gates grün.
- Gradle `:app:bundleRelease`: grün.
- Gradle `:app:lintRelease`: grün, 0 Fehler und 26 nicht blockierende
  Warnungen aus dem Capacitor-Scaffold beziehungsweise Launcher-/Splash-
  Ressourcen.
- Gradle `:app:testReleaseUnitTest`: grün.
- Gradle `:app:assembleAndroidTest`: grün.
- Gradle `:app:assembleDebug`: grün.

Der zunächst verwendete projektweite Sammelbefehl `assembleAndroidTest` baute
auch die leere Testvariante des generierten Cordova-Kompatibilitätsmoduls und
traf dort auf parallele Kotlin-Stdlib-Generationen. Der app-spezifische,
tatsächlich relevante Task `:app:assembleAndroidTest` ist grün. Deshalb wurde
keine globale Dependency-Auflösung verändert.

## Artefakte

### Nicht signiertes Release-AAB

- Pfad: `android/app/build/outputs/bundle/release/app-release.aab`
- Größe: 4,3 MB
- SHA-256:
  `00b0c6674716d71f2458ce1f612697bce599776e23009e950ab3a07e288ec076`
- `jarsigner`: nicht signiert

Dieses AAB ist ausschließlich lokale Build-Evidence. Es ist nicht das finale
Upload-Artefakt. Nach separater Freigabe müssen Play App Signing und ein
privater Upload-Key eingerichtet, der signierte AAB neu gebaut und alle
Binary-/Data-Safety-Gates erneut geprüft werden.

### Lokal installierbares QA-APK

- Pfad: `android/app/build/outputs/apk/debug/app-debug.apk`
- Größe: 5,7 MB
- SHA-256:
  `cdd1406f9803dd70f2ccf7ea662b4f9e95b034ea1536bc86eab812d891412463`
- Signatur: lokaler Android-Debug-Key; niemals in Play hochladen

Dieses APK enthält denselben zuvor validierten Production-Frontend-Build und
ist nur für den fokussierten physischen Geräte-Smoke vorgesehen.

## Manifest- und SDK-Audit

Das gemergte Release-Manifest enthält:

- `INTERNET`,
- `POST_NOTIFICATIONS`,
- `RECEIVE_BOOT_COMPLETED` und `WAKE_LOCK` für lokale Reminder,
- die appinterne Signaturberechtigung für nicht exportierte Receiver.

Nicht enthalten sind Mikrofon-, Kamera-, Kontakt-, Standort-, Speicher- oder
Werbe-ID-Berechtigungen. Cleartext-Traffic und Android-Backups sind deaktiviert.
Die drei App-Link-Pfade `/auth`, `/join` und `/organization/invite` sind mit
`autoVerify=true` registriert; die Website-Verifikation bleibt bis zum
separaten `assetlinks.json`-Deploy offen.

Im ausgelieferten Dependency-/Bundle-Audit wurden keine Werbe-, Billing-,
Firebase-/FCM-, Crash- oder Marketing-Analytics-SDKs gefunden.
`google-services.json` ist nicht vorhanden. Das eingebettete Bundle enthält das
erwartete Supabase-Production-Ziel. Die transitive Build-Abhängigkeit
`workbox-google-analytics` wird vom App-Build nicht verwendet und ist nicht im
ausgelieferten Web-Bundle referenziert.

## Physisch offen

- Installation, Kalt-/Warmstart und Android-System-Zurück,
- Tastatur, Safe Areas, Schriftgröße, Dark Mode und Rotation,
- Reminder-Permission, Zustellung und Boot-Restore,
- WebView-Spracheingabe oder sauberer Nicht-unterstützt-Zustand,
- Auth-, Invite- und Organization-App-Links,
- Offline/Online-Wechsel, Netzwerkziele und echte Android-Screenshots,
- Play Pre-launch Report auf dem später signierten Upload-Artefakt.
