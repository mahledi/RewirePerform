# App Store Technical Evidence

Stand: 17. Juli 2026

Scope: lokaler, nicht signierter Release- und Safety-Block auf Basis von
`origin/main` `f1903c1`, Privacy-/App-Store-Haertung und E-Mail-Bestaetigungsflow.
Kein Push, Merge nach `main`, Deploy, Production-Write, Archive oder Upload.

## Gruene Nachweise

| Gate | Ergebnis |
| --- | --- |
| `npm run app:build` | Production-Ziel validiert, Typecheck, Vite-Build, 172 Unit-/Vertragstests in 34 Dateien, Evidence-SQL, statisches App-Store-Gate, Capacitor-Sync und eingebettetes Production-Ziel bestanden |
| `npm run test:e2e` | 31 bestanden, 4 bewusst uebersprungen: Desktop-Chromium sowie WebKit auf iPhone hoch/quer und iPad hoch/quer; der echte Service-Worker-Offline-Test laeuft deterministisch nur in Chromium |
| `npm run app:verify:public` | Startseite, Privacy und Support auf Desktop/Mobile per HTTPS gerendert; keine Page Errors oder horizontaler Overflow |
| `npm run app:verify:xcode` | 8/8 mit Xcode 26.6, iOS SDK 26.5 und iOS-26.5-Runtime |
| `npm run app:verify:xcode:build` | 9/9 inklusive unsigniertem nativen Simulator-Build |
| `npm run app:verify:simulator` | Ein universeller unsignierter Build wurde auf temporaerem iPhone 17 Pro Max und iPad Pro 13-inch installiert und gestartet; stabilisierte Screenshots zeigen auf beiden Geraeten eine sichtbare, nicht ueberlagerte App-Oberflaeche |
| Session-Isolation | langsamer Rollenabruf eines vorherigen Accounts kann nach Wechsel oder Abmeldung keinen User-, Rollen-, Test- oder Monitoringzustand mehr ueberschreiben; zwei Race-Tests bestanden |
| Offline-Fallback | statische datenfreie Offline-Seite wird separat gespeichert und durch eine echte Offline-Navigation bestaetigt; App-Chunks bleiben zum Schutz vor gemischten Deploy-Versionen ungecached |
| Berechtigungsablehnung | Voice- und native Notification-Tests bestaetigen einen recoverbaren Abbruch; bei verweigerten Mitteilungen erfolgt weder Scheduling noch lokale Aktivierung |
| `npm run lint` | 0 Fehler; 15 verbleibende Warnungen nach Laufzeit-Triage |
| `npm audit --omit=dev` | 0 bekannte Production-Schwachstellen |
| Plist-Validierung | `Info.plist` und `PrivacyInfo.xcprivacy` syntaktisch gueltig |
| Content-Release-Test | alle 56 aufgeloesten Programmtage frei von TODO-/Platzhaltertext |

## Bewusst rote Gates

| Gate | Ergebnis |
| --- | --- |
| `npm run app:verify:xcode:signing` | 8/10; 0 gueltige Signing-Identitaeten und kein Developer Team |
| `npm run privacy:verify` | 7 technische Invarianten bestanden; 7 Release-Blocker fuer Minor-Autorisierung, Aggregatfilter und finale Privacy-Fassung |
| voller `npm audit` | 2 Dev-Tooling-Befunde im alten Vite/esbuild-Pfad; automatischer Fix waere ein ungeprueftes Major-Upgrade |

## Nicht verifiziert

- signierter Device- oder Distribution-Build;
- Archive, Xcode Privacy Report und App-Store-Upload;
- echter iPhone-Start, Lifecycle, Voice und native Reminder;
- Apple-App-Record, Zertifikate, Provisioning und App Store Connect;
- finale Privacy-/Minderjaehrigen-/Retention-/Provider-Freigabe;
- wissenschaftliche und rechtliche Freigabe der sichtbaren Claims;
- mehrtaegiger realer Pilot-Zeitlauf.

## Koordination

Der integrierte Tracking-/QA-Paritaetsstand von `origin/main` wurde getestet. Dieser
Block hat keine Tracking-Migration, Tracking-UI, RLS-/Consent-Logik,
Account-Loeschlogik oder Programmtag-Copy veraendert. Integriert wurden der bereits
separat gebaute E-Mail-Bestaetigungsflow sowie eine technische Auth-Session-Isolation.
