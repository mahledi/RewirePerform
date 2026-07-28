# RewirePerform App Store Readiness Status

Stand: 28. Juli 2026

Status: Der eingefrorene App-Code und das native iOS-Paket sind technisch
App-Store-ready. Der physisch freigegebene Code wurde unveraendert in `main`
integriert, als Apple-Distribution-Paket exportiert und von App Store Connect
ohne Fehler validiert. Es erfolgten kein TestFlight-Build, keine
App-Review-Einreichung und keine Veroeffentlichung.

Die technische Apple-Validierung ist keine Annahmegarantie. Vor der
Einreichung bleiben genau vier fachliche und operative Gates offen. Bereits
geschlossene Geraete-, Minderjaehrigen-, Offline-, Loesch- und
Apple-Distributionstests werden nicht erneut als neue Stopper gefuehrt.

## 1. Eingefrorener V1-Stand

| Element | Verifizierter Stand |
| --- | --- |
| `origin/main` | `84c0d70283a1ea78848ad9e8585f3f7f1898e146` |
| Integration | PR 102, CI und Vercel Production gruen |
| Physisch freigegebener Code | `33d15e909ea46fa0456f0f97e4698812bad73a29` |
| Codegleichheit | Merge-Tree und freigegebener Commit bytegleich |
| Bundle-ID | `com.rewireperform.app` |
| Version / Build | `1.0` / `1` |
| Apple-Team | `F7A976G38N` |
| Production-Ziel | Supabase `bqsbxesmybthwtxmowfz` |
| Mindestversion | iOS 15.0 |

Die V1-Oberflaeche verwendet die freigegebene visuelle Designsprache mit
echten Produktionsdaten und bestehenden Produktablaeufen. Inhalte,
Assessment-Scoring, Auth-, Minderjaehrigen-, Guardian-, RLS- und
Account-Loeschlogik wurden durch die UI-Integration nicht umgebaut.

## 2. Verifizierte technische und physische Gates

- vollstaendiger Build: 85 Testdateien und 448 Tests gruen;
- TypeScript, Production-Web-Build, Service Worker, saemtliche SQL-/Privacy-/
  Access-/Minor-/Deletion-Gates und App-Store-Statikpruefung gruen;
- eingebettetes iOS-Ziel bestaetigt Production
  `bqsbxesmybthwtxmowfz`;
- echtes iPhone und echtes iPad mit dem finalen Code installiert und von
  Mahle vollstaendig gruen freigegeben;
- iPhone-/iPad-Layout, Hoch-/Querformat, Scroll, Safe Area, Bottom Navigation,
  Plan und Entwicklung physisch geprueft;
- nativer Signup-, E-Mail-, Minderjaehrigen- und Guardian-Rueckweg gruen;
- Ablehnung, erneuter Freigabeversuch, abgelaufener Elternlink und
  Eltern-E-Mail-Korrektur praktisch geprueft;
- Flugmodus-Kaltstart und automatische Wiederverbindung gruen;
- Account-Loeschung einschliesslich der bereits dokumentierten
  Production-Restdatenkontrolle gruen.

Diese abgeschlossenen Tests bleiben historische Evidenz. Sie werden nur nach
einer spaeteren Aenderung ihres konkreten Codepfads erneut geoeffnet.

## 3. Apple-Distribution und Datenschutz

Persistentes Xcode-Archiv:

`~/Library/Developer/Xcode/Archives/2026-07-28/RewirePerform 1.0 (1) main-84c0d70-final.xcarchive`

Verifiziert:

- lokales `.xcarchive` erfolgreich;
- lokaler Export mit Methode `app-store-connect` erfolgreich;
- Signatur `Apple Distribution: Mahle Herzog (F7A976G38N)`;
- Store-Profil fuer `com.rewireperform.app`, gueltig bis 21. Juli 2027;
- keine Geraetebindung und `get-task-allow = false`;
- Bundle-ID, Version, Build, Universal Link und Codesign korrekt;
- App Store Connect: `App 1.0 (1) validated` und
  `successfully passed all validation checks`;
- kein TestFlight-Build und keine App-Review-Einreichung erzeugt.

Privacy Report:

`~/Desktop/RewirePerform-PrivacyReport-main-84c0d70-2026-07-28.pdf`

Der Bericht ist vollstaendig und visuell fehlerfrei. Er enthaelt Name,
E-Mail-Adresse, Health, Fitness, Customer Support, Other User Content, User
ID, Product Interaction und Other Diagnostic Data. Alle Kategorien sind
accountbezogen, aber nicht fuer Werbe- oder Cross-App-Tracking markiert. Der
Build enthaelt kein Sentry und kein `Crash Data`.

## 4. Dependency-Stand

Der reproduzierbare Production-Audit auf dem finalen Main-Stand meldet:

- 0 kritisch;
- 0 hoch;
- 2 moderat (`react-router` und `react-router-dom`).

Die nutzersteuerbaren Redirect-Pfade verwenden die gemeinsame strikte interne
Routenpruefung mit Regressionstests. Der SSR-Befund ist fuer die Vite-SPA
nicht anwendbar. Ein unkontrolliertes React-Router-7-Major-Upgrade bleibt
ausserhalb von V1.

## 5. Aktuelle oeffentliche Ziele

Am 28. Juli 2026 antworteten alle drei Store-Ziele erfolgreich mit HTTP 200:

- `https://rewireperform.com`
- `https://rewireperform.com/privacy`
- `https://rewireperform.com/support`

Vor dem finalen Upload werden Inhalt, Kontaktangaben und rechtliche
Vollstaendigkeit noch einmal gegen den eingefrorenen Store-Eintrag geprueft.

## 6. Genau vier verbleibende Gates

### Gate 1 - App Store Connect vervollstaendigen

- App-Eintrag read-only gegen das lokale Metadatenpaket pruefen;
- deutsche Texte, Kategorien, Preis, manuelle Freigabe und Verfuegbarkeit;
- Datenschutzantworten aus dem finalen Privacy Report;
- Altersfreigabe aus dem finalen Produkt beantworten;
- DSA-Traderstatus und verifizierte oeffentliche Kontaktdaten durch Mahle;
- finale iPhone-/iPad-Screenshots mit synthetischen Daten;
- nicht ablaufende synthetische Athlete-, Coach- und Admin-Reviewer-Konten;
- Review-Kontakt und Review-Hinweise.

### Gate 2 - Externe rechtliche Freigabe

Schriftliche, qualifizierte Pruefung von Minderjaehrigenflow, Guardian-
Autorisierung, Datenschutz, Retention, Account-Loeschung, Tracking/Evidence,
Claims, DSA und den finalen Store-Angaben.

### Gate 3 - TestFlight-Freeze

Nach eigener Upload-Freigabe genau den eingefrorenen Build zu TestFlight
uebertragen und 24 bis 48 Stunden von mindestens zwei unabhaengigen Personen
auf echten Geraeten testen lassen. Neue V1-Codeaenderungen oeffnen nur die
tatsaechlich betroffenen Tests erneut.

### Gate 4 - Einreichung

Nach Abschluss der ersten drei Gates eine eigene Freigabe fuer App Review
einholen, einreichen und Apples Rueckfragen oder Findings kontrolliert
bearbeiten. Die manuelle Veroeffentlichung bleibt ein eigener letzter
Owner-Schritt.

## 7. Freigabegrenze

Der aktuelle Code ist technisch archive-, export- und validierungsbereit. Ein
technischer Paket- oder Signierungsfehler ist nach der echten Apple-
Validierung kein bekannter Stopper. Apple kann eine App trotzdem wegen
Metadaten, Datenschutz-, Rechts-, Reviewer- oder Guideline-Fragen ablehnen.
Deshalb werden die vier verbleibenden Gates nicht mit technischer
Fehlerfreiheit gleichgesetzt.

Keine rechtliche Vereinbarung, kein TestFlight-Upload, keine App-Review-
Einreichung und keine Veroeffentlichung ohne den jeweils ausdruecklich
freigegebenen finalen Schritt.
