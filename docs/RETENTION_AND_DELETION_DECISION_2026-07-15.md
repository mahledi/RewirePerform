# Entscheidungsvorlage: Aufbewahrung und Loeschung

Stand: 23. Juli 2026

Sentry-Dashboard- und Dekommissionierungsnachtrag: 18. Juli 2026

Status: konkret vorgeschlagen, noch nicht rechtlich/operativ freigegeben

Technischer Nachtrag: Das echte Production-Projekt
`bqsbxesmybthwtxmowfz` wurde am 23. Juli 2026 read-only als gesundes
Supabase-Free-Projekt in Frankfurt bestätigt. Die unten als technisch aktiv
markierten Fristen laufen serverseitig; die Backup-Regel bleibt dagegen ein
noch nicht umgesetztes Betriebs-Gate.

Ziel ist eine Regel, die den 56-Tage-Pilot und serioese spaetere Auswertungen ermoeglicht, aber keine personenbezogenen Daten „auf Vorrat“ behaelt. Vollstaendig anonymisierte Aggregate sind von pseudonymisierten oder nur direkt identifierfreien Datensaetzen zu unterscheiden: Pseudonymisierte Daten bleiben personenbezogen.

## 1. Vorgeschlagene verbindliche Fristen

| Datenklasse | Startpunkt | Maximale Frist | Loesch-/Sperrregel | Zweck |
|---|---|---:|---|---|
| aktiver Account und Programmdaten | Account-Loeschung | sofort im aktiven System | transaktionale Loeschung; kein weiterer Produkt-/Analysezugriff | Betroffenenrecht und Account-Ende |
| Supabase-managed Backups | providerseitiger Sicherungslauf | keine unbestaetigte Zeilenfrist behaupten | Free bietet keinen fuer RewirePerform nutzbaren automatischen Backupdienst; Pro haelt taegliche Backups 7 Tage; bei Vertragsende sieht der aktuelle DPA nach 30 Tagen Rueckgabefrist die Loeschung aller Covered Data vor | Providerbetrieb/Disaster Recovery |
| eigene verschluesselte DB-Exports | Erstellung des Exports | 7 Tage | rolling deletion; getrennte Schluessel; Restore nur durch freigegebenen Runbook-Prozess | Free-Plan-Uebergang/Notfall |
| historische Sentry-Events vor Dekommissionierung | Eventzeitpunkt | providerseitig maximal 30 Tage | keine neuen App-Events nach Deployment; bestehende Events laufen automatisch aus | historische Fehlerdiagnose |
| `app_event_log` | Eventzeitpunkt | 30 Tage | taeglicher serverseitiger Cleanup | Incident-Diagnose |
| `notification_log` | Erstellung des Eintrags | 90 Tage | taeglicher serverseitiger Cleanup; keine privaten Inhalte | Reminder-/Pilotqualitaet |
| Push-Subscription | Opt-out oder Account-Loeschung | sofort | Subscription und Endpoint entfernen | Benachrichtigung |
| geschlossenes Feedback | Status `resolved`/`closed` | 180 Tage | Inhalt loeschen; nur anonyme Issue-Kategorie behalten | Support/Produktverbesserung |
| fehlgeschlagener Loeschnachweis | Abschluss/Fehler | 12 Monate | nur Request-ID, Status, Zeitpunkt, minimierter Code; keine E-Mail oder Nutzdaten | Nachweis und Support |
| Consent-/Guardian-Receipt | Erstellung des Nachweises | technisch 3 Jahre | nur minimierter Nachweis, Version, Scope und Zeitpunkt; Frist rechtlich bestaetigen | Nachweis der Einwilligung |
| Guardian-Challenge | Erstellung | 7 Tage | verschluesselte Elternadresse, Token-Hash und Zustellmetadaten loeschen; notwendiges Receipt getrennt | Einmal-Autorisierung |
| personenbezogene Pilot-/Evidence-Rohdaten | finaler Pilotbericht oder Widerruf | konkretes Enddatum im Protokoll, vorgeschlagen hoechstens 12 Monate nach Abschluss | Zweckbindung, pseudonymisiert, Schluessel getrennt; Widerrufsregel anwenden | genehmigte Evaluation |
| vollstaendig anonyme Gruppenaggregate | irreversible Anonymisierung | keine personenbezogene Frist | Anonymitaet dokumentieren und Re-Identifikationsrisiko pruefen | Langfristige Statistik |

Die Drei-Jahres-Frist fuer minimierte Consent-Nachweise ist technisch aktiv,
braucht aber weiterhin eine konkrete Rechtsfreigabe. Die Frist fuer
Evidence-Rohdaten braucht eine konkrete Rechts-/Pilotentscheidung und wird nicht
allein aufgrund dieser Vorlage implementiert.

## 2. Backup-Loeschfrist

Verbindliche Regel fuer eigene, von RewirePerform erstellte Exporte:

> Ein eigener temporaerer Sicherungsexport darf maximal sieben Kalendertage ab
> Erstellung verschluesselt und zugriffsgesperrt verbleiben. Er darf in dieser
> Zeit weder fuer Produkt, Support, Analytics noch Evidence genutzt werden und
> muss danach nachweisbar geloescht werden.

Diese eigene Frist darf nicht pauschal als Providerfrist bezeichnet werden.
Supabase dokumentiert fuer Free keinen nutzbaren automatischen Backupdienst und
fuer Pro taegliche Backups mit sieben Tagen Aufbewahrung. Der aktuelle DPA
verlangt nach Ende des Vertrags nach einer 30-taegigen Rueckgabefrist die
Loeschung aller Covered Data. Die konkrete Rotation einer einzelnen im aktiven
System geloeschten Zeile ist damit nicht bestaetigt und bleibt bis zur
Provider-/Rechtspruefung ein Release-Gate.

Jeder Restore muss ein Deletion-Replay ausfuehren:

1. Restore in gesperrte Umgebung.
2. Liste der seit Backup-Erstellung geloeschten User-IDs aus einem getrennten, minimierten Tombstone-Register anwenden.
3. Betroffene Accounts und personenbezogene Zeilen erneut loeschen.
4. Erst danach Anwendung freigeben.
5. Durchgefuehrten Restore und Replay auditieren.

Ohne Deletion-Replay ist ein Backup-Restore fuer einen echten Pilot nicht releasefaehig.

## 3. Supabase-Planentscheidung

Supabase dokumentiert aktuell, und der Production-Plan wurde am 23. Juli 2026
read-only als `free` bestätigt:

- Free: keine im Dashboard nutzbaren automatischen Backups; regelmaessige eigene `db dump`-Exports werden empfohlen.
- Pro: taegliche Backups mit sieben Tagen Aufbewahrung und sieben Tage Log-Retention.
- DPA bei Vertragsende: 30 Tage Rueckgabefrist, danach Loeschung aller
  verarbeiteten Covered Data; dies ist keine Zeilen-Backupfrist im laufenden
  Vertrag.

Fuer interne Entwicklung kann Free ausreichen. Vor einem echten Mannschaftspilot mit Minderjaehrigen ist Pro der konservative Betriebsweg, weil die Sieben-Tage-Backupregel ohne selbst gebaute Backup-Infrastruktur technisch nachvollziehbar wird und das Projekt nicht wegen Inaktivitaet pausiert.

Ein Free-Pilot waere nur vertretbar, wenn vorher ein automatisierter, verschluesselter, getesteter und nach sieben Tagen rotierender Export-/Restore-Prozess existiert. Ein manueller gelegentlicher Dump ist kein belastbarer Pilotbetrieb.

Der vor dem Production-Apply am 14. Juli erstellte verschluesselte Export ist
vor dem Pilot zu inventarisieren. Er muss entweder nachweisbar geloescht oder
durch eine dokumentierte Ausnahme mit Verantwortlichem und festem Enddatum neu
freigegeben werden.

## 4. Sentry-Aufbewahrung

Der Product Owner hat nach dem Dashboard-Audit entschieden, Sentry aus der App
zu entfernen und das Projekt zu behalten. Der Release-Kandidat enthaelt kein SDK,
keine DSN, keine Initialisierung und keinen Capture-Pfad mehr. Verbindlicher
technischer Vertrag: `docs/SENTRY_DECOMMISSION_DECISION_2026-07-18.md`.

Am 18. Juli wurden Organisation und Projekt read-only im echten Dashboard geprueft:

- Datenregion `European Union (EU)`; Sentry ordnet diese Region Frankfurt,
  Deutschland, zu;
- kostenloser Developer-Plan mit 30 Tagen Lookback/Aufbewahrung;
- Testzeitraum beendet, keine Abrechnungsdaten und keine Zahlungsmethode;
- alle Marketingkategorien abbestellt;
- Session Replay, Logs, Tracing, Profiling und Metrics aktuell ohne Nutzung;
- aggregierte identifizierende Datennutzung deaktiviert.

Bereits eingegangene Events laufen innerhalb dieser 30 Tage providerseitig aus.
Weil nach Deployment keine neuen App-Events mehr an Sentry gehen, sind die
30-Tage-Freigabe, DPA-Ablage und nutzerspezifische Sentry-Loeschstrecke kein
technisches Gate fuer den neuen Pilot-Datenstrom. Ob fuer die historische
Verarbeitung bis zu ihrem Ablauf noch DPA-, Verzeichnis- oder Loeschmassnahmen
erforderlich sind, bleibt rechtlich zu pruefen. Eine erneute Verbindung wuerde
alle Provider- und Privacy-Gates wieder oeffnen.

## 5. Evidence und langfristiger Erkenntnisgewinn

Moeglichst viele Erkenntnisse zu erhalten bedeutet nicht, personenbezogene Rohdaten unbegrenzt zu speichern.

Der empfohlene Ablauf ist:

1. Nur vorher genehmigte und consentierte Messwerte in den Evidence-Datensatz aufnehmen.
2. Direkte Identifikatoren entfernen und Re-Identifikationsschluessel getrennt verwalten.
3. Rohdaten nur bis zum protokollierten Analyseende halten.
4. Ergebnisse mit Stichprobengroesse, Missingness und Aussagegrenzen aggregieren.
5. Nach Rohdatenfrist nur Aggregate behalten, wenn technisch und organisatorisch belegt ist, dass keine Einzelperson mehr bestimmbar ist.
6. Bei kleinen Teams insbesondere Kombinationen aus Sport, Position, Datum und seltenen Ereignissen als Re-Identifikationsrisiko behandeln; `n >= 5` allein beweist keine Anonymitaet.

## 6. Technische Umsetzung nach Freigabe

- versionierte Tabelle `retention_policies` oder unveraenderliche Repo-Konfiguration;
- serverseitige Cleanup-Funktionen mit festen Batches und `SKIP LOCKED`;
- Supabase Cron fuer `app_event_log`, `notification_log`, Feedback und Challenges;
- getrenntes Deletion-Tombstone-Register ohne E-Mail oder Profildaten;
- Backup-Export mit Verschluesselung, Lifecycle-Rule und Restore-Harness;
- Admin-Status nur mit Zaehlern und aeltestem Datensatz, ohne private Inhalte;
- Alarm, wenn Cleanup ausfaellt oder ein Datensatz seine Frist ueberschreitet;
- Zeitreise-/Clock-Tests und ein echter Restore-Test vor Pilotstart.

## 7. Freigabefelder

Vor Implementation auszufuellen:

- Controller/Verantwortlicher:
- Datenschutz-Freigabe durch:
- Freigabedatum:
- Backupfrist bestaetigt:
- Sentry-Dekommissionierung bestaetigt: ja; historische Events maximal 30 Tage; rechtliche Altdatenpruefung offen
- Consent-Receipt-Frist bestaetigt:
- Evidence-Enddatum und Widerrufsregel:
- Restore-Verantwortlicher:
- Abweichungen mit Begruendung:

## 8. Offizielle Quellen

- Supabase Backups: https://supabase.com/docs/guides/platform/backups
- Supabase Pricing: https://supabase.com/pricing
- Supabase DPA: https://supabase.com/downloads/docs/Supabase%2BDPA%2B260601.pdf
- Apple App Review Guidelines 5.1.1: https://developer.apple.com/app-store/review/guidelines/
- DSGVO Art. 5, 17 und 25: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- Sentry GDPR Guidance: https://sentry.io/resources/gdpr/
- Sentry Data Storage Location: https://docs.sentry.io/organization/data-storage-location/
- Sentry Pricing: https://sentry.io/pricing/
