# Sentry Privacy- und Security-Audit

Stand: 18. Juli 2026

Status: echtes Dashboard und lokaler Code read-only geprueft. Es wurden keine
Sentry-Einstellungen, Vertraege, Abos, Zahlungsdaten oder Production-Systeme
geaendert.

## 1. Kurzurteil

Sentry kann als minimierter Fehlerdiagnose-Dienst im Pilotkonzept verbleiben. Die
EU-Datenregion und die 30-Tage-Aufbewahrung des kostenlosen Developer-Plans
erfuellen die vorgeschlagene harte Obergrenze von 30 Tagen. Der bevorzugte
14-Tage-Zielwert wird damit jedoch nicht erreicht.

Fuer einen Minderjaehrigenpilot ist die aktuelle Organisation noch nicht
freigegeben. Vorher muessen insbesondere persoenliche Zwei-Faktor-Authentifizierung,
die organisationsweiten Privacy-Schalter, das Data Processing Amendment und ein
getesteter nutzerbezogener Loeschprozess abgeschlossen werden.

## 2. Im Dashboard verifiziert

- bestehende Organisation `rewireperform` und bestehendes Projekt
  `javascript-react`;
- Datenregion `European Union (EU)`; Sentry ordnet die EU-Region Frankfurt,
  Deutschland, und der regionalen API `de.sentry.io` zu;
- kostenloser Developer-Plan mit 30 Tagen Lookback/Aufbewahrung und einem
  Organisationsmitglied;
- kostenloser Testzeitraum beendet; keine Abrechnungsdaten und keine
  Zahlungsmethode hinterlegt;
- alle sechs Marketingkategorien abbestellt;
- Early-Adopter-Funktionen deaktiviert;
- Nutzung aggregierter identifizierender Servicedaten fuer Produktverbesserung
  deaktiviert;
- keine aktuelle Nutzung von Session Replay, Logs, Tracing, Profiling oder
  Metrics im Usage-Dashboard;
- persoenliche Zwei-Faktor-Authentifizierung fuer den einzigen Account ist
  vollstaendig inaktiv;
- das Data Processing Amendment wird als `Review and Accept` angezeigt und ist
  damit noch nicht als abgeschlossen nachgewiesen;
- EU-Representative- und DPO-Felder sind leer; ob diese Rollen fuer den konkreten
  Verantwortlichen erforderlich sind, ist rechtlich zu entscheiden.

## 3. Aktuelle Organisationskonfiguration

| Einstellung | Ist-Stand | Empfohlener Pilotstand |
|---|---|---|
| Require Two-Factor Authentication | aus | nach persoenlichem 2FA-Setup einschalten |
| Allow Shared Issues | an | ausschalten |
| Enhanced Privacy | aus | einschalten |
| Allow JavaScript Source Fetching | an | ausschalten, sofern kein dokumentierter Bedarf besteht |
| Allow Join Requests | an | fuer den kontrollierten Pilot ausschalten |
| Require Data Scrubber | aus | einschalten |
| Require Default Scrubbers | aus | einschalten |
| Prevent Storing IP Addresses | aus | einschalten |
| Show Generative AI Features | an | fuer den Pilot ausschalten |
| Use of aggregated identifying data | aus | ausgeschaltet lassen |

Diese Schalter wurden nur gelesen. Keine Empfehlung in dieser Tabelle ist bereits
umgesetzt.

## 4. Code-seitige Datenminimierung

`src/lib/monitoring.ts` besitzt bereits einen strikten Diagnosevertrag:

- `sendDefaultPii: false`;
- Tracing-Sampling auf `0`;
- keine Breadcrumbs;
- keine automatische Browser-, Global-Handler- oder Try/Catch-Erfassung;
- Cookies, Header, Request-Daten, Query-Strings und freie Metadaten werden
  entfernt;
- URLs werden auf Origin und Pfad reduziert;
- der User-Kontext wird auf eine stabile technische ID begrenzt;
- Fehlermeldungen werden normalisiert;
- Session Replay und Profiling werden nicht konfiguriert.

Der fokussierte Privacy-Test `src/test/monitoringPrivacy.test.ts` besteht mit vier
von vier Tests. Die Dashboard-Schalter bleiben trotzdem erforderlich, weil sie
eine zweite Schutzschicht und den dokumentierten Organisationsvertrag bilden.

## 5. Erforderliche Reihenfolge

1. Der Account-Inhaber richtet selbst Passkey oder Authenticator-App ein und
   speichert die Wiederherstellungscodes sicher. Dieser Schritt verarbeitet ein
   persoenliches Geheimnis und wird nicht automatisiert.
2. Nach gesonderter Freigabe werden die empfohlenen Organisationsschalter gesetzt
   und anschliessend erneut read-only verifiziert.
3. Eine vertretungsberechtigte Person prueft und akzeptiert das Data Processing
   Amendment; aktuelle Subprozessoren und Transfermechanismen werden abgelegt.
4. Die Sentry-Offenlegung in Datenschutzerklaerung und App Store Privacy Details
   wird gegen den realen Diagnosevertrag abgeglichen.
5. Suche, Export und vorzeitige Loeschung zu einer stabilen User-ID werden mit
   einem Testaccount als Runbook durchgespielt.
6. Die 30-Tage-Aufbewahrung wird fachlich akzeptiert oder Sentry bleibt fuer den
   Minderjaehrigenpilot deaktiviert.

## 6. Offene Entscheidungen

- Sentry-Events fuer maximal 30 Tage im Developer-Plan akzeptieren oder Sentry
  fuer den Minderjaehrigenpilot deaktivieren;
- Data Processing Amendment durch den rechtlich befugten Verantwortlichen
  akzeptieren;
- klaeren, ob und welche GDPR-Kontaktrollen einzutragen sind;
- festlegen, wer nutzerbezogene Sentry-Loeschungen ausfuehrt und dokumentiert.

## 7. Nicht ausgefuehrt

- keine Zwei-Faktor-Authentifizierung eingerichtet oder erzwungen;
- kein Privacy- oder Security-Schalter geaendert;
- kein Data Processing Amendment akzeptiert;
- kein kostenloser Test gestartet;
- keine Marketing-E-Mail aktiviert;
- kein Sentry-Event geloescht, aufgeloest oder archiviert;
- kein Push, Merge, Deploy oder Production-Apply ausgefuehrt.

## 8. Offizielle Quellen

- Sentry Data Storage Location: https://docs.sentry.io/organization/data-storage-location/
- Sentry Pricing: https://sentry.io/pricing/
- Sentry GDPR Guidance: https://sentry.io/resources/gdpr/
- Sentry Subprocessors: https://sentry.io/legal/subprocessors/
