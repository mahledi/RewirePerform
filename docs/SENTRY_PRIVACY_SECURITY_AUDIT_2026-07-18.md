# Sentry Privacy- und Security-Audit

Stand: 18. Juli 2026

Status: historischer Dashboard- und Code-Audit. Account und Organisation wurden
sicherheitsseitig gehaertet und nach erneutem Laden verifiziert. Anschliessend
hat der Product Owner entschieden, Sentry aus der App zu entfernen und das
Sentry-Projekt zu behalten.

## Entscheidungsnachtrag

Der aktive Release-Kandidat enthaelt kein Sentry-SDK, keine DSN, keine
Initialisierung und keinen Capture-Pfad mehr. Das bestehende Konto, die
Organisation und das Projekt bleiben unveraendert erhalten; vorhandene Events
laufen nach der verifizierten 30-Tage-Aufbewahrung aus. Damit ist die unten
beschriebene Konfiguration historische Sicherheits- und Verarbeitungsevidenz,
nicht mehr der geplante App-Betrieb. Verbindlicher aktueller Stand:
`docs/SENTRY_DECOMMISSION_DECISION_2026-07-18.md`.

## 1. Kurzurteil

Vor der spaeteren Dekommissionierungsentscheidung konnte Sentry als minimierter
Fehlerdiagnose-Dienst im Pilotkonzept verbleiben. Die
EU-Datenregion und die 30-Tage-Aufbewahrung des kostenlosen Developer-Plans
erfuellen die vorgeschlagene harte Obergrenze von 30 Tagen. Der bevorzugte
14-Tage-Zielwert wird damit jedoch nicht erreicht.

Account- und Organisationsschutz sind fuer den vorgesehenen Ein-Personen-Betrieb
gehaertet. Fuer einen Minderjaehrigenpilot fehlen weiterhin die fachliche
30-Tage-Entscheidung, das Data Processing Amendment, die Provider-Ablage und ein
getesteter nutzerbezogener Loeschprozess.

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
- persoenlicher Passkey ist aktiv, Wiederherstellungscodes wurden durch den
  Account-Inhaber gesichert und organisationsweite Zwei-Faktor-Authentifizierung
  ist erzwungen;
- das Data Processing Amendment wird als `Review and Accept` angezeigt und ist
  damit noch nicht als abgeschlossen nachgewiesen;
- EU-Representative- und DPO-Felder sind leer; ob diese Rollen fuer den konkreten
  Verantwortlichen erforderlich sind, ist rechtlich zu entscheiden.

## 3. Aktuelle Organisationskonfiguration

| Einstellung | Ist-Stand | Empfohlener Pilotstand |
|---|---|---|
| Require Two-Factor Authentication | an | erfuellt |
| Allow Shared Issues | aus | erfuellt |
| Enhanced Privacy | an | erfuellt |
| Allow JavaScript Source Fetching | an | bewusst aktiv fuer Fehlergruppierung ohne hochgeladene Source Maps |
| Allow Join Requests | aus | erfuellt |
| Require Data Scrubber | an | erfuellt |
| Require Default Scrubbers | an | erfuellt |
| Prevent Storing IP Addresses | an | erfuellt; gilt fuer neue Events |
| Show Generative AI Features | aus | erfuellt |
| Use of aggregated identifying data | aus | erfuellt |

Die gespeicherte Konfiguration wurde nach Navigation auf eine andere Seite erneut
geladen und in diesem Zustand bestaetigt. JavaScript Source Fetching bleibt bewusst
aktiv: Sentry hat beim Abschalten vor schlechterer Fehlergruppierung ohne
hochgeladene Source Maps gewarnt. Die Funktion liest den oeffentlich ausgelieferten
App-Bundle-Code und erweitert nicht den erlaubten Nutzer-Datenvertrag.

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
- Session Replay und Profiling werden nicht konfiguriert;
- lokale HTTP-Preview-Builds senden standardmaessig nicht an Sentry; ein bewusst
  aktivierter lokaler Integrationstest wird als `local-preview` statt
  `production` getrennt;
- der native `capacitor://localhost`-Origin bleibt fuer echte App-Builds
  funktionsfaehig.

Der fokussierte Privacy-Test `src/test/monitoringPrivacy.test.ts` prueft diese
Grenzen einschliesslich mehrerer Loopback-Adressen und des Capacitor-Origins. Die
Dashboard-Schalter bleiben trotzdem erforderlich, weil sie eine zweite
Schutzschicht und den dokumentierten Organisationsvertrag bilden.

## 5. Historische Aktivierungsanforderungen

Die folgende Reihenfolge ist durch die Dekommissionierungsentscheidung fuer den
aktuellen Release-Kandidaten ausgesetzt. Sie gilt wieder, falls Sentry erneut
verbunden werden soll.

1. Erledigt: Der Account-Inhaber hat einen Passkey eingerichtet und die
   Wiederherstellungscodes sicher gespeichert.
2. Erledigt: Die Organisationsschalter wurden gehaertet, gespeichert und nach
   erneutem Laden verifiziert.
3. Eine vertretungsberechtigte Person prueft und akzeptiert das Data Processing
   Amendment; aktuelle Subprozessoren und Transfermechanismen werden abgelegt.
4. Die Sentry-Offenlegung in Datenschutzerklaerung und App Store Privacy Details
   wird gegen den realen Diagnosevertrag abgeglichen.
5. Suche, Export und vorzeitige Loeschung zu einer stabilen User-ID werden mit
   einem Testaccount als Runbook durchgespielt.
6. Die 30-Tage-Aufbewahrung wird fachlich akzeptiert oder Sentry bleibt fuer den
   Minderjaehrigenpilot deaktiviert.

## 6. Durch Dekommissionierung ausgesetzte Entscheidungen

- Sentry-Events fuer maximal 30 Tage im Developer-Plan akzeptieren oder Sentry
  fuer den Minderjaehrigenpilot deaktivieren;
- Data Processing Amendment durch den rechtlich befugten Verantwortlichen
  akzeptieren;
- klaeren, ob und welche GDPR-Kontaktrollen einzutragen sind;
- festlegen, wer nutzerbezogene Sentry-Loeschungen ausfuehrt und dokumentiert.

## 7. Ausgefuehrt

- Passkey und Wiederherstellungscodes durch den Account-Inhaber eingerichtet;
- organisationsweite Zwei-Faktor-Authentifizierung erzwungen;
- Shared Issues und Join Requests deaktiviert;
- Enhanced Privacy, Data Scrubber, Default Scrubbers und IP-Speicherschutz
  aktiviert;
- generative Sentry-Funktionen deaktiviert;
- JavaScript Source Fetching nach sichtbarer Sentry-Warnung bewusst aktiv
  gelassen;
- alle Werte nach erneuter Seitennavigation verifiziert.

## 8. Nicht ausgefuehrt

- kein Data Processing Amendment akzeptiert;
- kein kostenloser Test gestartet;
- keine Marketing-E-Mail aktiviert;
- kein Sentry-Event geloescht, aufgeloest oder archiviert;
- kein Push, Merge, Deploy oder Production-Apply ausgefuehrt.

## 9. Offizielle Quellen

- Sentry Data Storage Location: https://docs.sentry.io/organization/data-storage-location/
- Sentry Pricing: https://sentry.io/pricing/
- Sentry GDPR Guidance: https://sentry.io/resources/gdpr/
- Sentry Subprocessors: https://sentry.io/legal/subprocessors/
