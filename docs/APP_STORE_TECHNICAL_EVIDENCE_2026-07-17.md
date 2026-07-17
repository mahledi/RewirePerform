# App Store Technical Evidence

Stand: 17. Juli 2026

Scope: lokaler, nicht signierter Release- und Safety-Block auf Basis von
`origin/main` `f1903c1` plus Privacy-Haertung `d962701`. Kein Push, Merge, Deploy,
Production-Write, Archive oder Upload.

## Gruene Nachweise

| Gate | Ergebnis |
| --- | --- |
| `npm run app:build` | Production-Ziel validiert, Typecheck, Vite-Build, 161 Unit-/Vertragstests, Evidence-SQL, statisches App-Store-Gate, Capacitor-Sync und eingebettetes Production-Ziel bestanden |
| `npm run test:e2e` | 20/20 auf Desktop-Chromium, iPhone-WebKit hoch/quer und iPad-WebKit |
| `npm run app:verify:public` | Startseite, Privacy und Support auf Desktop/Mobile per HTTPS gerendert; keine Page Errors oder horizontaler Overflow |
| `npm run app:verify:xcode` | 8/8 mit Xcode 26.6, iOS SDK 26.5 und iOS-26.5-Runtime |
| `npm run app:verify:xcode:build` | 9/9 inklusive unsigniertem nativen Simulator-Build |
| `npm run app:verify:simulator` | Build, Installation und Launch auf temporaerem iPhone 17 Pro Max; sichtbare nichtleere App-Oberflaeche in Wiederholungslaeufen nach rund 4.7 bis 7.1 Sekunden |
| `npm run lint` | 0 Fehler; 16 bereits bekannte Warnungen |
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
Block hat keine Tracking-Migration, Tracking-UI, Auth-/RLS-/Consent-Logik,
Account-Loeschlogik oder sichtbare Produkt-Copy veraendert.
