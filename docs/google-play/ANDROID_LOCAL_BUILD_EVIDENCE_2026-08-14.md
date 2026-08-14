# RewirePerform 1.1 — lokale Android-Build-Evidence

Stand: 14. August 2026
Scope: final repinnter lokaler Build mit privatem Upload-Key und fokussiertem
Redmi-Geräte-Smoke; kein Play-Upload, kein Tester-Rollout und noch kein
vollständiger Geräte-Smoke des finalen Builds

## Identität

- integrierte Basis-SHA: `3edae2205f51e5248e7190b650313a897a559941`
- Android-RC-SHA: `6ea43fe682d3c9562560f015ec0736aeb6f0fecb`
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
- `npm run ci`: 163 Testdateien, 920 Tests, alle grün.
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

### Mit privatem Upload-Key signiertes Release-AAB

- Pfad: `android/app/build/outputs/bundle/release/app-release.aab`
- Größe: 5.044.305 Bytes
- SHA-256:
  `f505c526fea4d96dc3a0c749b831c787c3f29fab8253168aad8a17d4aa795814`
- `jarsigner`: verifiziert; SHA-256 / SHA256withRSA, 4096 Bit

Der Upload-Key liegt außerhalb des Repositories; sein Kennwort liegt im
macOS-Schlüsselbund und wurde weder ausgegeben noch committed. Google Play App
Signing und der tatsächliche Upload bleiben Console-Gates. Vor dem Upload sind
die offenen Data-Safety-, Listing- und Geräte-Gates zu schließen.

### Lokal installierbares QA-APK

- Pfad: `android/app/build/outputs/apk/debug/app-debug.apk`
- Größe: 6.811.331 Bytes
- SHA-256:
  `15932a662a068c90258b3f6ca538f91d36571ca48e0de8ff3eca84c41e580970`
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

## Fokussierter physischer Android-Smoke

Auf einem Redmi Note 7 mit Android 10, MIUI 12.5.1 und Android System WebView
150 wurde der neue Debug-Build als Paketupdate installiert und kalt gestartet.
Der gemeldete P1-Tastaturfehler ist geschlossen:

- Gboard laeuft nicht im Vollbild-/Extract-Modus.
- Vor dem Fix verkleinerte Capacitor 8 den bereits durch `adjustResize`
  verkleinerten WebView ein zweites Mal: 630 px WebView-Hoehe und eine grosse
  native weisse Flaeche vor der Tastatur.
- Der Android-Shell-Fix deaktiviert ausschliesslich diese doppelte
  SystemBars-Inset-Behandlung und setzt den nativen Fensterhintergrund auf die
  gesperrte Markenfarbe `#0D0E12`.
- Nach dem Fix verbleiben bei geoeffneter Tastatur korrekt 1.445 px
  WebView-Hoehe. Login-E-Mail und Registrierungs-Name wurden fokussiert; App,
  Eingabefelder und CTA reichen ohne weisse Zwischenflaeche direkt bis Gboard.

## Physisch offen

- Warmstart und Android-System-Zurück,
- weitere Safe-Area-, Schriftgrößen-, Dark-Mode- und Rotations-Smokes,
- Reminder-Permission, Zustellung und Boot-Restore,
- WebView-Spracheingabe oder sauberer Nicht-unterstützt-Zustand,
- Auth-, Invite- und Organization-App-Links,
- Offline/Online-Wechsel, Netzwerkziele und echte Android-Screenshots,
- Play Pre-launch Report auf dem signierten Upload-Artefakt.
