# MahleOS Feedback Read Implementation Review

## Ziel

MahleOS soll technisches und produktbezogenes In-App-Feedback read-only lesen können, ohne Admin-Passwort, strukturierte Nutzeridentitäten, Anhänge oder Admin-Notizen zu erhalten. Bereinigter Freitext bleibt potenziell personenbezogen und ist daher besonders geschützt.

## Lokaler Stand

- Branch: `codex/mahleos-observability-v1`
- Ausgangscommit dieses Hardening-Schritts: `fb972334cf8e96720b2c0157b4bb3fc6a2ccce31`
- finaler Producer-Commit: wird beim bytegenauen Handoff aus dem abgeschlossenen lokalen Commit übernommen
- Contract: `rewireperform-mahleos-feedback-read` `1.1.0`
- Status: `IMPLEMENTED_NOT_PRODUCTION_ACTIVATED`
- Production-Migration: nicht angewendet
- Edge Function: nicht deployed
- Machine Key: nicht erzeugt, gelesen oder hinterlegt
- MahleOS Live-Zugriff: nicht aktiviert

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

Der am 27. Juli 2026 erneut ausgeführte `npm audit --omit=dev` meldete acht
bekannte Treffer: unter anderem in Build-/CLI-Ketten sowie in der aktuellen
React-Router-6-Linie. Diese Änderung ergänzt keine neue Abhängigkeit. Ein
Router-Major-Upgrade wird nicht ungeprüft mit dem Feedback- und
Guardian-Sicherheitsblock vermischt; der Befund bleibt bis zu einem eigenen,
vollständig getesteten Dependency-Hardening-Block offen.

Das unabhängige R4-Hardening vom 27. Juli 2026 bestätigte erneut die
vollständige CI mit 67 Testdateien und 367 Tests, die ausführbare
PGlite-Migration einschließlich Least-Privilege-Rechten und cursorfreier
interner IDs, Privacy Safety mit 22 von 22 Prüfungen sowie die
Datenschutzdarstellung ohne horizontalen Überlauf auf Desktop und Mobil.

## Offene Aktivierungsgates

Vor einem Live-Zugriff sind separat erforderlich:

1. Erneutes unabhängiges R4-Review von Migration, Funktion, Rechte- und Privacy-Grenzen.
2. Konkrete Production-Freigabe für genau diese Migration.
3. Konkrete Deployment-Freigabe für genau diese Edge Function.
4. Getrennter Machine-Key in Supabase und macOS Keychain.
5. Beaufsichtigter positiver Read mit einem bewusst vom Betreiber eingereichten,
   nicht sensiblen Feedback. Ein nicht markierter Testaccount darf dafür nicht
   als Produktionsnutzer ausgegeben werden.
6. Negativtests für falschen Key, markierte Testdaten, unbekannte Felder, gemeinsames
   Valid-/Invalid-Request-Limit und Rohtextpersistenz.
7. In Production nachweisen, dass die bestehende 30-Tage-Bereinigung für App-Ereignisse aktiv läuft.
8. Die 90-Tage-Bereinigung des Machine-Zugriffslogs separat terminieren und freigeben.
9. Eine fachlich und rechtlich freigegebene Aufbewahrungsfrist für erledigtes Feedback festlegen; bis dahin keine automatische Löschung erfinden.
10. Erst danach zeitgesteuerter Schattenbetrieb.

Keines dieser Gates wurde durch die lokale Implementierung automatisch freigegeben.
