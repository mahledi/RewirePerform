# Entscheidungsvorlage: Aufbewahrung und Loeschung

Stand: 15. Juli 2026

Sentry-Dashboard- und Dekommissionierungsnachtrag: 18. Juli 2026

Status: konkret vorgeschlagen, noch nicht rechtlich/operativ freigegeben

Ziel ist eine Regel, die den 56-Tage-Pilot und serioese spaetere Auswertungen ermoeglicht, aber keine personenbezogenen Daten „auf Vorrat“ behaelt. Vollstaendig anonymisierte Aggregate sind von pseudonymisierten oder nur direkt identifierfreien Datensaetzen zu unterscheiden: Pseudonymisierte Daten bleiben personenbezogen.

## 1. Vorgeschlagene verbindliche Fristen

| Datenklasse | Startpunkt | Maximale Frist | Loesch-/Sperrregel | Zweck |
|---|---|---:|---|---|
| aktiver Account und Programmdaten | Account-Loeschung | sofort im aktiven System | transaktionale Loeschung; kein weiterer Produkt-/Analysezugriff | Betroffenenrecht und Account-Ende |
| Supabase-managed Backups | Erstellung des Backups | 7 Tage | automatische Rotation; geloeschte Konten duerfen bei Restore nicht wieder aktiv werden | Disaster Recovery |
| eigene verschluesselte DB-Exports | Erstellung des Exports | 7 Tage | rolling deletion; getrennte Schluessel; Restore nur durch freigegebenen Runbook-Prozess | Free-Plan-Uebergang/Notfall |
| historische Sentry-Events vor Dekommissionierung | Eventzeitpunkt | providerseitig maximal 30 Tage | keine neuen App-Events nach Deployment; bestehende Events laufen automatisch aus | historische Fehlerdiagnose |
| `app_event_log` | Eventzeitpunkt | 30 Tage | taeglicher serverseitiger Cleanup | Incident-Diagnose |
| `notification_log` | Ende des zugehoerigen Programmlaufs | 90 Tage | danach loeschen oder fuer einen genehmigten Evidence-Zweck irreversibel aggregieren | Reminder-/Pilotqualitaet |
| Push-Subscription | Opt-out oder Account-Loeschung | sofort | Subscription und Endpoint entfernen | Benachrichtigung |
| geschlossenes Feedback | Status `resolved`/`closed` | 180 Tage | Inhalt loeschen; nur anonyme Issue-Kategorie behalten | Support/Produktverbesserung |
| fehlgeschlagener Loeschnachweis | Abschluss/Fehler | 12 Monate | nur Request-ID, Status, Zeitpunkt, minimierter Code; keine E-Mail oder Nutzdaten | Nachweis und Support |
| Consent-/Guardian-Receipt | Widerruf oder Ende der Verarbeitung | vorgeschlagen 3 Jahre | nur minimierter Nachweis, Version, Scope und Zeitpunkt; Frist rechtlich bestaetigen | Nachweis der Einwilligung |
| Guardian-Challenge | Ablauf oder Nutzung | 24 Stunden nach Abschluss, spaetestens 7 Tage nach Erstellung | Token-Hash und Zustellmetadaten loeschen; notwendiges Receipt getrennt | Einmal-Autorisierung |
| personenbezogene Pilot-/Evidence-Rohdaten | finaler Pilotbericht oder Widerruf | konkretes Enddatum im Protokoll, vorgeschlagen hoechstens 12 Monate nach Abschluss | Zweckbindung, pseudonymisiert, Schluessel getrennt; Widerrufsregel anwenden | genehmigte Evaluation |
| vollstaendig anonyme Gruppenaggregate | irreversible Anonymisierung | keine personenbezogene Frist | Anonymitaet dokumentieren und Re-Identifikationsrisiko pruefen | Langfristige Statistik |

Die Fristen fuer Consent-Nachweise und Evidence-Rohdaten brauchen eine konkrete Rechts-/Studienentscheidung. Sie werden nicht allein aufgrund dieser Vorlage implementiert.

## 2. Backup-Loeschfrist

Vorgeschlagene harte Regel:

> Personenbezogene Daten, die aus dem aktiven System geloescht wurden, koennen maximal sieben weitere Kalendertage in verschluesselten, zugriffsgesperrten Backups verbleiben. Sie duerfen in dieser Zeit weder fuer Produkt, Support, Analytics noch Evidence genutzt werden. Nach Ablauf werden sie durch Backup-Rotation geloescht.

Jeder Restore muss ein Deletion-Replay ausfuehren:

1. Restore in gesperrte Umgebung.
2. Liste der seit Backup-Erstellung geloeschten User-IDs aus einem getrennten, minimierten Tombstone-Register anwenden.
3. Betroffene Accounts und personenbezogene Zeilen erneut loeschen.
4. Erst danach Anwendung freigeben.
5. Durchgefuehrten Restore und Replay auditieren.

Ohne Deletion-Replay ist ein Backup-Restore fuer einen echten Pilot nicht releasefaehig.

## 3. Supabase-Planentscheidung

Supabase dokumentiert aktuell:

- Free: keine im Dashboard nutzbaren automatischen Backups; regelmaessige eigene `db dump`-Exports werden empfohlen.
- Pro: taegliche Backups mit sieben Tagen Aufbewahrung und sieben Tage Log-Retention.

Fuer interne Entwicklung kann Free ausreichen. Vor einem echten Mannschaftspilot mit Minderjaehrigen ist Pro der konservative Betriebsweg, weil die Sieben-Tage-Backupregel ohne selbst gebaute Backup-Infrastruktur technisch nachvollziehbar wird und das Projekt nicht wegen Inaktivitaet pausiert.

Ein Free-Pilot waere nur vertretbar, wenn vorher ein automatisierter, verschluesselter, getesteter und nach sieben Tagen rotierender Export-/Restore-Prozess existiert. Ein manueller gelegentlicher Dump ist kein belastbarer Pilotbetrieb.

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
- Apple App Review Guidelines 5.1.1: https://developer.apple.com/app-store/review/guidelines/
- DSGVO Art. 5, 17 und 25: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- Sentry GDPR Guidance: https://sentry.io/resources/gdpr/
- Sentry Data Storage Location: https://docs.sentry.io/organization/data-storage-location/
- Sentry Pricing: https://sentry.io/pricing/
