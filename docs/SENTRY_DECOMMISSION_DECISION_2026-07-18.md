# Entscheidung: Sentry aus der App entfernen

Stand: 18. Juli 2026

Status: vom Product Owner freigegeben und im Release-Kandidaten technisch
umgesetzt. Das bestehende Sentry-Konto, die Organisation und das Projekt bleiben
erhalten. Erst ein Deployment dieses Kandidaten beendet den Datenstrom der
ausgelieferten App.

Dieses Dokument ist eine technische Produktentscheidung, kein Rechtsgutachten.

## Entscheidung

RewirePerform verwendet Sentry bis auf Weiteres nicht mehr als App-Diagnosedienst.
Das reduziert externe Datenweitergabe, Provider- und Vertragsaufwand sowie die
Anzahl der fuer App Store Privacy zu erklaerenden aktiven SDKs.

Nicht Teil dieser Entscheidung sind:

- Loeschung des Sentry-Kontos, der Organisation oder des Projekts;
- manuelle Loeschung, Archivierung oder Veraenderung vorhandener Events;
- eine Aussage, dass alle anderen Privacy-, Minderjaehrigen- oder Release-Gates
  geschlossen seien.

## Technischer Vertrag

Der Release-Kandidat enthaelt:

- kein `@sentry/*`-Paket in `package.json`, `package-lock.json` oder `bun.lock`;
- keine Sentry-DSN, keinen DSN-Fallback und keine Sentry-Environment-Variable;
- keine Initialisierung beim App-Start;
- keinen Sentry-Nutzerkontext im Auth-Flow;
- keinen direkten Capture-Pfad im globalen `ErrorBoundary`;
- eine statische Privacy-Invariante, die SDK, DSN und Runtime-Capture im
  ausgelieferten App-Surface blockiert.

Technische Fehler werden weiterhin ausschliesslich ueber das bestehende
`app_event_log` erfasst. Der Client schreibt nur normalisierte Fehlercodes,
bereinigte Routen und allow-listete technische Metadaten. Originale
Fehlermeldungen, Stack Traces, Journaltexte, Antworten und Teamcodes gehoeren
nicht in diesen Pfad. Das Logging darf den Nutzerflow nicht brechen.

## Vorhandene Sentry-Daten

Das vorhandene Projekt bleibt sicherheitsseitig gehaertet. Bereits vor der
Dekommissionierung eingegangene Events unterliegen weiterhin der im Dashboard
verifizierten 30-Tage-Aufbewahrung und laufen danach providerseitig aus. Fuer den
aktuellen Build sind Sentry-DPA, Sentry-Disclosure und eine nutzerspezifische
Sentry-Loeschstrecke kein technisches Gate des neuen App-Datenstroms mehr,
solange die App getrennt bleibt. Ob fuer die historische Verarbeitung bis zu
ihrem Ablauf noch DPA-, Verzeichnis- oder Loeschmassnahmen erforderlich sind,
bleibt einer qualifizierten Rechts-/Privacy-Pruefung vorbehalten.

Die historische Verarbeitung und der fruehere Dashboard-Audit bleiben in der
internen Verfahrens- und Entscheidungsdokumentation nachvollziehbar.

## Bewusste Betriebsgrenze

Ohne externen Crash-Dienst koennen harte Abstuerze vor Login, Offline-Fehler und
Fehler vor einem erfolgreichen `app_event_log`-Insert unbemerkt bleiben. Fuer den
kontrollierten Pilot werden deshalb interne Incident-Events, Admin-Systemstatus,
direktes Nutzerfeedback, reproduzierbare QA und regelmaessige Code-/E2E-Checks
kombiniert. Das ist eine bewusste Pilotentscheidung, kein vollwertiger Ersatz
fuer spaeteres Crash Reporting in grossem Massstab.

## Wiederaktivierungsgate

Sentry oder ein anderer externer Diagnosedienst darf nur nach einer neuen
ausdruecklichen Produktentscheidung wieder verbunden werden. Vorher muessen
mindestens Datenvertrag, DPA, Provider-Offenlegung, Aufbewahrung,
nutzerspezifische Loeschung, Minderjaehrigen-Scope, App Store Privacy Details und
technische Privacy-Tests erneut freigegeben sein.

## Verifikation

- `npm test -- src/test/monitoringPrivacy.test.ts src/test/authContextIsolation.test.tsx`
- `npm run typecheck`
- `npm run privacy:verify`
- Repository-Suche nach `@sentry`, `VITE_SENTRY`, der alten Ingest-Domain und
  entfernten Initialisierungsfunktionen
- finaler Production-Build und Xcode-Privacy-Report vor App-Store-Einreichung
