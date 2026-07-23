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
- Retry nur einmal bei `429` oder `503`,
- service-role-only Datenbankfunktion,
- serverseitige Kanonisierung von Nutzer, Status, Zeitpunkt, Kategorie und technischer Umgebung,
- serverseitige Ableitung von Rolle, Teambezug und Teststatus für technische App-Ereignisse,
- maximal 60 clientseitige App-Ereignisse je Nutzer und Minute,
- clientseitige Ereignisse sind ausdrücklich nicht autoritativ und können den globalen Zustand allein nicht auf Rot setzen,
- Produktionsdaten und nicht als Test markierte Feedbackzeilen,
- begrenztes Rate-Limit-Audit und manuell freizugebende 90-Tage-Retention,
- kein Coach- oder Clientzugriff auf die Machine-Funktion.

## Verifikation

Am 23. Juli 2026 bestanden:

- Typecheck,
- Build,
- 67 Testdateien mit 365 Tests,
- globaler Lint ohne Fehler und mit 15 bereits bestehenden Warnungen,
- Feedback-Contract- und Privacy-Tests,
- ausführbare Handler-Tests für Auth-, Methoden-, Größen-, Schema-, Datenbank- und Projektionsfehler,
- PGlite-Verifikation für Rechte, Testdatenausschluss, stabile Pagination, serverseitige Kanonisierung, direkte Musterbereinigung, technische Feldgrenzen, Audit, Retention und Rate Limit,
- vollständiges `npm run ci`,
- Privacy Safety mit 20 von 20 Prüfungen,
- Produktionsabhängigkeiten mit 0 bekannten Schwachstellen,
- Secret-Musterprüfung ohne reale Zugangsdaten; ausschließlich erwartete synthetische Negativtestwerte und leere Beispielvariablen,
- `git diff --check`.

Der vollständige Dependency-Audit meldete drei bereits bestehende Hinweise in Entwicklungswerkzeugen: zwei hohe und einen moderaten. Der reine Production-Audit blieb bei null bekannten Schwachstellen. Es wurde kein neuer Runtime-Dependency ergänzt und kein riskantes Major-Upgrade in diesen Scope gezogen.

## Offene Aktivierungsgates

Vor einem Live-Zugriff sind separat erforderlich:

1. Erneutes unabhängiges R4-Review von Migration, Funktion, Rechte- und Privacy-Grenzen.
2. Konkrete Production-Freigabe für genau diese Migration.
3. Konkrete Deployment-Freigabe für genau diese Edge Function.
4. Getrennter Machine-Key in Supabase und macOS Keychain.
5. Beaufsichtigter synthetischer Read mit Testfeedback.
6. Negativtests für falschen Key, Testdaten, unbekannte Felder und Rohtextpersistenz.
7. In Production nachweisen, dass die bestehende 30-Tage-Bereinigung für App-Ereignisse aktiv läuft.
8. Die 90-Tage-Bereinigung des Machine-Zugriffslogs separat terminieren und freigeben.
9. Eine fachlich und rechtlich freigegebene Aufbewahrungsfrist für erledigtes Feedback festlegen; bis dahin keine automatische Löschung erfinden.
10. Erst danach zeitgesteuerter Schattenbetrieb.

Keines dieser Gates wurde durch die lokale Implementierung automatisch freigegeben.
