# V1.4 – offizieller Pilot-Datenvertrag

Status: `BUILT_LOCALLY__PRODUCTION_READ_ONLY_AUDITED__NOT_ACTIVE`

## Zweck

Der offizielle Pilot darf weder durch frühere Produkttests verfälscht werden noch seine legitime Vorher-Messung verlieren. Deshalb besitzt jeder Programmlauf zwei getrennte, menschlich freizugebende Zeitfenster:

1. `baseline_started_at`: Beginn des offiziellen Onboardings. Ein vollständig abgeschlossener, versionierter Startfragebogen darf vor Programmtag 1 liegen.
2. `activity_started_at`: Beginn der offiziellen In-Programm-Daten. Check-ins, Verständnis-Checks, Tagesabschlüsse, Assessments, Transfer- und Coach-Beobachtungen vor diesem Zeitpunkt sind keine Pilot-Evidenz.

Konten, Teammitgliedschaften, Guardian-Freigaben und Einwilligungen sind Betriebs-/Berechtigungsdaten. Sie werden durch diese Grenze weder zu Evidenz erklärt noch gelöscht.

## Production-Realität am 1. September 2026

Read-only geprüft für den aktiven, nicht als Test markierten Programmlauf `TSV U17`:

- Programmbeginn: `2026-09-01`, Zeitzone `Europe/Berlin`.
- 28 nicht als Test markierte Programminstanzen.
- Bestehendes Evidence-Gate: 23 Instanzen aktuell berechtigt, vier `consent_required`, eine `minor_authorization_required`. Produktnutzung bleibt davon getrennt; nicht berechtigte Personen werden lediglich aus interner Evidenz ausgeschlossen.
- 28 vollständige `onboarding_v2/v2`-Startfragebögen, jeweils ein vollständiger Datensatz pro Athlet, abgeschlossen zwischen 27. und 31. August. Diese bilden die legitime Pilot-Baseline.
- 28 zusätzliche unvollständige Fragebogenstände. Sie sind Fortschritts-/Entwurfsstände und werden niemals als Baseline gezählt.
- Vier Pre-Assessments vor dem 1. September. Sie sind Vorlauf-/Testdaten und werden aus der offiziellen Pilot-Evidenz ausgeschlossen.
- Die am 1. September erhobenen Tagesabschlüsse, Check-ins und Verständnis-Checks liegen vollständig nach dem Aktivitätsbeginn und sind offizielle Pilot-Aktivität, sofern die bestehenden QA-, Einwilligungs- und Berechtigungsgates ebenfalls erfüllt sind.
- Verständnis-Snapshot: 13 abgeschlossene Tag-1-Checks, davon 11 unter dem bestehenden Evidence-Gate auswertbar. In diesen 11 Checks waren 6 von 11 Antworten korrekt (`54,5 %`). Das ist ein deskriptiver Verständniswert, kein Wirkungs- oder Kausalitätsnachweis.
- Historische Fortschritts-Snapshots vor dem Start sind abgeleitete Zustände. Sie sind unabhängig vom Datum nie Roh-Evidenz und werden bei Bedarf aus den zugelassenen Quellen neu berechnet.

Die Zählwerte sind ein Audit-Snapshot und wachsen während des Piloten weiter. Verbindlich sind die Regeln, nicht die Momentzahl.

## Quellenregeln

| Quelle | Zeitfenster | zusätzliche Regel |
|---|---|---|
| vollständiger Onboarding-Fragebogen | Baseline | exakt `onboarding_v2/v2`, gleiche Programminstanz, nur `is_complete = true` |
| Pre/Mid/Post-Assessment | Aktivität | keine vorgezogene Testmessung; Instrumente bleiben semantisch getrennt |
| Verständnis-Check | Aktivität | `completed_at`, Programmtag und Inhaltsversion müssen gültig sein |
| Daily Check-in | Aktivität | lokales Programmdatum plus serverseitiger Aktivierungszeitpunkt |
| Tagesabschluss | Aktivität | nur wirklich abgeschlossene Tage; Nutzung ist keine Wirkung |
| Journal | Aktivität | nur Abschluss-Präsenz; Antworten und Freitext bleiben ausgeschlossen |
| Athlete Transfer | Aktivität | strukturiert, consentiert, `is_test = false` |
| Coach-Beobachtung | Aktivität | nur strukturierte freigegebene Werte, keine privaten Notizen |
| Progress Snapshot | nie Rohquelle | ausschließlich reproduzierbare Ausgabe |

## Fail-closed-Verhalten

- Ohne freigegebenes Fenster ist jede V1.4-Evidenzaufnahme gesperrt.
- Unbekannte Quellen sind gesperrt.
- Testnutzer, Testinstanzen und Testteams bleiben ausgeschlossen.
- Incomplete Fragebögen bleiben ausgeschlossen.
- Vor dem Aktivitätsfenster gespeicherte Messungen bleiben ausgeschlossen, auch wenn sie später derselben Programminstanz zugeordnet wurden.
- Offline-Synchronisation darf einen echten Programmtag nachliefern, aber keinen Tag vor Programmstart in offizielle Evidenz verwandeln.
- Die Reconciliation liefert nur Zählwerte und Ausschlussgründe, niemals Namen, E-Mails, Antworten, Scores, Journale oder Freitext.

## Aktivierung des aktuellen Piloten

Vor Production werden die beiden Zeitpunkte für den konkreten Programmlauf separat freigegeben. Der technische Kandidat ist:

- Baseline-Fenster: vor dem ersten vollständigen offiziellen Onboarding am 27. August 2026.
- Aktivitätsfenster: `2026-09-01 00:00 Europe/Berlin`.

Die Production-Migration, das Eintragen dieses Fensters, Protokollaktivierung und Backfill bleiben vier getrennte Schritte. Für jeden Schritt sind Dry Run, Reconciliation, Security Advisors und eine ausdrückliche Freigabe erforderlich.
