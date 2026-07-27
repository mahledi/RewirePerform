# MahleOS Feedback Read Implementation Review

## Ziel

MahleOS soll technisches und produktbezogenes In-App-Feedback read-only lesen können, ohne Admin-Passwort, strukturierte Nutzeridentitäten, Anhänge oder Admin-Notizen zu erhalten. Bereinigter Freitext bleibt potenziell personenbezogen und ist daher besonders geschützt.

## Aktueller Stand

- Branch: `codex/mahleos-observability-v1`
- Ausgangscommit dieses Hardening-Schritts: `fb972334cf8e96720b2c0157b4bb3fc6a2ccce31`
- Production-Runtime-Fix: `c641524`
- Contract: `rewireperform-mahleos-feedback-read` `1.1.0`
- Status: `PRODUCTION_ACTIVATED_SUPERVISED_EMPTY_READ_VERIFIED`
- Production-Migrationen: `20260723154047` und `20260723165153` angewendet
- Edge Function: `mahleos-feedback-read` Version 2 aktiv
- Machine Key: getrennt in Supabase und macOS Keychain hinterlegt
- MahleOS Live-Zugriff: lokal `CONNECTED_READ_ONLY`

## Datenschutzgrenzen

Der Endpunkt liefert ausschließlich:

- eine nicht rückrechenbare Feedback-Referenz,
- Kategorie und Status,
- Zeitpunkt,
- den serverseitig um erkannte E-Mail-Adressen, Telefonnummern und schlüsselartige Werte bereinigten Feedbacktext,
- eine streng begrenzte technische Umgebung ohne Nutzer- oder Gerätekennung.

Explizit ausgeschlossen sind strukturierte:

- Namen, E-Mail-Adressen und Nutzer-IDs aus Profil- oder Kontodaten,
- Admin-Notizen,
- Anhänge,
- Journal, Reflexion und psychologische Einzelwerte,
- Testdaten,
- allgemeiner Datenbank- oder Admin-Zugriff.

Freitext kann trotz serverseitiger Musterbereinigung persönliche Angaben und insbesondere Namen enthalten. Der Vertrag weist dies ausdrücklich aus. MahleOS muss den Text deshalb vor jeder möglichen Modellnutzung ein zweites Mal lokal bereinigen. Sensible Inhalte zu Minderjährigen, mentaler Gesundheit oder Datenschutz dürfen nicht automatisch an ein Modell weitergegeben werden. Der Rohtext darf in MahleOS nicht persistiert werden.

## Sicherheitsmodell

- eigener Machine-Key nur für Feedback, getrennt von der Aggregate-API,
- ausschließlich `POST`,
- unbekannte Felder und Contract-Versionen blockieren,
- nach erfolgreicher Machine-Authentifizierung werden auch falscher Medientyp,
  zu grosse Bodies, ungueltiges JSON und ungueltige Schemas serverseitig
  begrenzt und ohne Request-Body oder Nutzerangaben auditiert,
- gueltige und ungueltige authentifizierte Requests teilen dasselbe Limit von
  30 Requests pro Minute; Methoden- und Auth-Fehler bleiben davor,
- Retry nur einmal bei `429` oder `503`,
- service-role-only Datenbankfunktion,
- serverseitige Kanonisierung von Nutzer, Status, Zeitpunkt, Kategorie und technischer Umgebung,
- `app_version` bleibt nur im streng begrenzten Format `x.y.z` oder
  `x.y.z+build` erhalten. Der Wert ist `client_reported_non_authoritative`, dient
  ausschliesslich der technischen Triage und darf weder Evidence noch
  Wirkungsaussagen beeinflussen,
- serverseitige Ableitung von Rolle, Teambezug und Teststatus für technische App-Ereignisse,
- Pagination-Cursor enthalten nur Zeitpunkt und nicht rückrechenbare
  Feedback-Referenz, niemals die interne Feedback-ID,
- die Access-Log-Tabelle erlaubt der `service_role` ausschließlich `SELECT`
  und `INSERT`; `UPDATE` und `DELETE` werden auch bei alten Supabase-
  Standardrechten explizit entzogen,
- maximal 60 clientseitige App-Ereignisse je Nutzer und Minute,
- clientseitige Ereignisse sind ausdrücklich nicht autoritativ und können den globalen Zustand allein nicht auf Rot setzen,
- Produktionsdaten und nicht als Test markierte Feedbackzeilen,
- begrenztes Rate-Limit-Audit und manuell freizugebende 90-Tage-Retention,
- kein Coach- oder Clientzugriff auf die Machine-Funktion.

## Verifikation

Am 23. Juli 2026 bestanden:

- Typecheck,
- Build,
- 67 Testdateien mit 367 Tests,
- globaler Lint ohne Fehler und mit 15 bereits bestehenden Warnungen,
- Feedback-Contract- und Privacy-Tests,
- ausführbare Handler-Tests für Auth-, Methoden-, Größen-, Schema-, Audit-, Datenbank- und Projektionsfehler,
- PGlite-Verifikation für Rechte, Testdatenausschluss, stabile Pagination, serverseitige Kanonisierung, direkte Musterbereinigung, technische Feldgrenzen, generisches Invalid-Request-Audit ohne Payload, gemeinsame Rate-Limit-Grenze, Retention und Rate Limit,
- vollständiges `npm run ci`,
- Privacy Safety mit 20 von 20 Prüfungen,
- aktueller Dependency-Audit mit acht bekannten Treffern
  (fünf hoch, drei moderat), getrennt vom erfolgreichen Funktions- und
  Privacy-Nachweis,
- Secret-Musterprüfung ohne reale Zugangsdaten; ausschließlich erwartete synthetische Negativtestwerte und leere Beispielvariablen,
- `git diff --check`.

Der integrierte App-Store-RC verwendet den vollständig getesteten React Router
`7.18.1`. Damit sind die für diese Client-App relevanten Redirect-Befunde aus
Router 6 auf Paketebene geschlossen. `npm audit --omit=dev` meldet noch zwei
hohe Paketknoten für denselben RSC-Advisory. Dieser betrifft laut offiziellem
Advisory ausschließlich instabile React-Server-Components-APIs; RewirePerform
nutzt diese APIs und React-Router-Serverpakete nicht. `app:verify` erzwingt
diese Client-only-Grenze. Der vollständige Audit inklusive
Entwicklungswerkzeugen bleibt mit 1 moderaten und 20 hohen Paketknoten ein
separater Toolchain-Hardeningblock.

Das unabhängige R4-Review vom 27. Juli 2026 bestätigte auf dem integrierten
Release Candidate:

- vollständige CI mit 85 Testdateien und 441 Tests,
- die ausführbare PGlite-Migration einschließlich service-role-only RPC,
  Least-Privilege-Access-Log und cursorfreier interner IDs,
- die fail-closed Edge Function mit separatem Machine-Key, striktem
  Request-/Response-Schema und doppelter Privacy-Projektion,
- Privacy Safety mit 22 von 22 Prüfungen,
- App-Store-Statik, Xcode-Readiness und Signierung,
- die iPhone-/iPad-Simulatormatrix in normaler und barrierearmer Darstellung,
- öffentliche Pflichtseiten auf Desktop und Mobil.

## Production-Aktivierungsnachweis vom 27. Juli 2026

Nach ausdrücklicher Production-Freigabe wurden ausschließlich die beiden
Feedback-Migrationen angewendet, ein separater 256-Bit-Machine-Key außerhalb
des Repositories gespeichert und die dedizierte Edge Function aktiviert.

Der erste korrekt authentifizierte Live-Aufruf deckte einen Deno-Laufzeitfehler
bei der Request-ID-Erzeugung auf. Der minimale Fix `c641524` bindet die native
UUID-Funktion nicht mehr als losgelöste Methode ein. Ein eigener Regressionstest
deckt genau den echten Runtime-Pfad ohne injizierten Testgenerator ab.

Nach dem erneuten Deployment wurde verifiziert:

- Edge Function `mahleos-feedback-read`, Version 2, aktiv, JWT-Verifikation
  bewusst deaktiviert zugunsten des getrennten konstantzeitgeprüften
  Machine-Keys, Deployment-Hash
  `3455e27abf7995d13f9c5bd8c741ceceae1be18892e01588c1d33d369e00983a`,
- kein Key und falscher Key jeweils `401`,
- echter Key über die macOS Keychain liefert `CONNECTED_READ_ONLY`,
- aktuell `0` Production-Feedbackzeilen, keine Rohtextpersistenz in MahleOS,
- erfolgreicher Read mit `returned_count = 0` und Response-Checksum im
  payloadfreien Access-Log,
- authentifiziertes ungültiges JSON liefert `400` und ausschließlich den
  generischen Auditcode `invalid_json`,
- die tägliche Production-Retention `minor-auth-retention-daily` ist aktiv;
  die letzten drei Läufe waren erfolgreich und es gibt keine App-Ereigniszeile
  älter als 30 Tage,
- vollständiges `npm run ci` mit 85 Testdateien und 442 Tests,
- sämtliche Feedback-SQL-, Privacy-, Contract- und statischen
  App-Store-Readiness-Gates grün.

## Verbleibende Pilotgates

Die sichere technische Verbindung ist aktiv. Für einen belastbaren realen
Pilotnachweis bleiben getrennt:

1. Ein bewusst vom Betreiber eingereichtes, nicht sensibles echtes Feedback
   beaufsichtigt lesen. Ein nicht markierter Testaccount darf nicht als
   Produktionsnutzer ausgegeben werden.
2. Den Ausschluss einer markierten synthetischen Feedbackzeile in Production
   nachweisen, ohne echte Nutzerdaten zu verändern.
3. Die 90-Tage-Bereinigung des Machine-Zugriffslogs separat terminieren und
   freigeben.
4. Eine fachlich und rechtlich freigegebene Aufbewahrungsfrist für erledigtes
   Feedback festlegen; bis dahin keine automatische Löschung erfinden.
5. Erst danach einen zeitgesteuerten Schattenbetrieb aktivieren.

Die Support-E-Mail-Anbindung, automatische Modellanalyse und autonome
Production-Fixes sind nicht Bestandteil dieser Aktivierung und bleiben
separate, explizit zu prüfende Daten- und Aktionspfade.
