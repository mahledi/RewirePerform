# RewirePerform 1.1 — Android Release Evidence

Stand: 20. August 2026
Status: finaler lokaler, mit privatem Upload-Key signierter Play-Kandidat;
noch kein Play-Upload und kein Test-Release veröffentlicht

## Identität

- integrierte Basis: `origin/main` `07ae1c0579432de220c8098079d17eb4f26f1bea`
- Android-Build-SHA: `02f5a9011532be8e0583ffe1b431f253dcc495cd`
- Branch: `codex/android-v1-1-review-ready-20260814`
- Package: `com.rewireperform.app`
- `versionName`: `1.1`
- `versionCode`: `2`
- `minSdk` / `compileSdk` / `targetSdk`: `24 / 36 / 36`
- Production-Ziel: `bqsbxesmybthwtxmowfz`
- Feedback Intelligence/Jarvis: im ausgelieferten Client geschlossen

`versionCode 2` ist absichtlich monoton höher als der erste lokale Kandidat.
Die sichtbare Produktversion bleibt `1.1`.

## Grüne Gates

- vollständiges `npm run app:build:android`: grün
- 169 Testdateien / 948 Tests: grün
- TypeScript: grün
- Production- und eingebettetes Android-Ziel: grün
- `npm audit --omit=dev`: 0 Schwachstellen
- Gradle `:app:bundleRelease`: grün
- Gradle `:app:lintRelease`: grün, 0 Fehler und 27 nicht blockierende
  Scaffold-/Dependency-/Icon-Warnungen
- Gradle `:app:testReleaseUnitTest`: grün
- Gradle `:app:assembleAndroidTest`: grün
- Gradle `:app:assembleDebug`: grün
- AAB-Signatur: `jarsigner` verifiziert

## Artefakte

### Signiertes Release-AAB — ausschließlich für Google Play

- Pfad: `android/app/build/outputs/bundle/release/app-release.aab`
- Größe: 4.969.559 Bytes
- SHA-256:
  `af77fa91bd81e152799f5ae7169f38c384085bf7decaecbec2d8c7982a08c22f`
- Signiert mit dem privaten RewirePerform-Upload-Key außerhalb des Repositories

Der selbstsignierte Upload-Key ist für Play App Signing vorgesehen. Schlüssel
und Kennwort wurden weder ausgegeben noch committed. Google erzeugt nach dem
Upload die eigentliche App-Signing-Identität.

### QA-APK — niemals bei Google Play hochladen

- Pfad: `android/app/build/outputs/apk/debug/app-debug.apk`
- Größe: 6.284.241 Bytes
- SHA-256:
  `cc6712d0b57a530c0e57190d269fc3553e51b014c7eec8fc395fe7a7aa9d06dc`
- verifizierte Metadaten: `com.rewireperform.app`, Code `2`, Version `1.1`,
  `minSdk 24`, `targetSdk 36`

## Binary-/SDK-Audit

Das gemergte Release-Manifest enthält nur `INTERNET`,
`POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED` und `WAKE_LOCK` sowie die
appinterne nicht exportierte Receiver-Berechtigung. Es enthält keine Mikrofon-,
Kamera-, Kontakt-, Standort-, Speicher- oder Werbe-ID-Berechtigung.
Cleartext-Traffic und Android-Backups sind deaktiviert.

Im ausgelieferten Dependency-/Bundle-Audit wurden keine Werbe-, Billing-,
Firebase-/FCM-, Crash- oder Marketing-Analytics-SDKs gefunden. Sentry und
`google-services.json` sind nicht enthalten. Spracheingabe läuft über das
lokale Android-Spracherkennungs-Plugin; die App fordert keine eigene
Mikrofonberechtigung an und speichert keine Audiodatei.

## Physische Android-Evidence

Gerät: Redmi Note 7, Android 10, MIUI 12.5.1, Android System WebView 150.

Auf dem funktional identischen Android-1.1-Kandidaten wurden durch Mahle
physisch geprüft: Start/Splash, Anmeldung und Registrierung, Athleten- und
Coach-Dashboard, Teambeitritt und Coach-/Athleten-Verbindung, Minderjährigen-
und Guardian-Weg, E-Mail-Flows, Kernprogramm, Kontoeinstellungen sowie die
mobile Darstellung. Die große weiße Fläche über der Tastatur ist geschlossen.
Der finale Launcher-Safe-Zone-Stand mit 60-Prozent-Foreground wurde auf dem
Redmi ausdrücklich visuell freigegeben.

ADB bestätigt für das installierte Paket den neuen Kanal
`rewireperform-reminders-v1` mit Wichtigkeit 4 und aktivierter Vibration. Eine
lokale Erinnerung wurde vom System erzeugt; die abschließende sichtbare
Heads-up-Zustellung des neuen Kanals bleibt ein fokussierter letzter
Gerätesmoke. Der einzige Runtime-Unterschied zum hier gebauten Code-2-Artefakt
ist die monotone Versionsnummer.

## Bis zum Teststart offen

- AAB in Play App Signing hochladen, aber Release noch nicht veröffentlichen
- Play Pre-launch Report prüfen
- Google-App-Signing-SHA-256 übernehmen und `assetlinks.json` veröffentlichen;
  erst dann öffnen `/auth`, `/join` und `/organization/invite` verlässlich die App
- mindestens zwei echte, datenschutzsaubere Android-Screenshots hochladen
- Data Safety, App-Zugriff, Zielgruppe und Inhaltsrating final speichern
- finaler Heads-up-Reminder-Smoke auf dem Redmi
- Tester und Track erst nach separater Freigabe konfigurieren/veröffentlichen
