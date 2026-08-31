# V1.4 Longitudinal Evidence — Mess- und Analysevertrag

Status: `BUILT_NOT_ACTIVE`  
Protokoll: `longitudinal-evidence-v1.4-draft-2026-08`

## Zweck und Grenze

V1.4 soll die Veränderung innerhalb derselben Person und desselben Programmlaufs nachvollziehbar beschreiben. Es ist kein Diagnoseinstrument, kein psychologisches Personenprofil und kein kausaler Wirksamkeitsnachweis. Rohantworten und Freitexte werden nicht in das neue Evidenzmodell kopiert.

## Unveränderlicher Baseline-Datensatz

Ein später freigegebener Baseline-Snapshot enthält ausschließlich:

- pseudonyme `subject_ref`, `program_instance_id`, `program_run_id` und `team_id`;
- Instrument, Version und Vertrags-Checksumme;
- Abschlusszeitpunkt, Einwilligungsversion und Einwilligungszeitpunkt;
- Guardian-/Assent-/Produktfreigabestatus als begrenzten Autorisierungsbeleg;
- QA-Ausschluss, erwartete und vorhandene Itemzahl, Vollständigkeit und Qualitätsstatus;
- einen Digest des Quellstands, aber keine Rohantworten oder Freitexte.

Der aktuelle Pilot wird mit dieser Migration **nicht** rückwirkend verarbeitet. Backfill und Aktivierung benötigen Block 9 sowie einen getrennten, kontrollierten Lauf.

## 36 Fragen und sieben Konstrukte

Die maschinenlesbare Einzelzuordnung liegt in `src/lib/evidenceV14/measurementContract.ts` und wird gegen die kanonische Questionnaire-V2-Quelle getestet.

Primär:

1. Fehler und Rückkehr
2. Druck und Regulation
3. Prozessfokus und Präsenz
4. Handeln unter Unsicherheit
5. Teamverbundenheit

Explorativ:

6. Erholung und Belastung
7. Motivation und Prozessorientierung

`private_only`-Items bleiben ausschließlich in der privaten Athletenansicht und sind aus pseudonymer interner sowie Coach-Aggregation technisch ausgeschlossen. Alle Questionnaire-Werte sind interne, nicht validierte Selbstberichte.

## Zulässige Paarungen

Paarungen erfordern identische Werte für:

- `subject_ref`
- `program_run_id`
- Instrument und Instrumentversion
- Konstrukt
- Quellenfamilie

Zulässig sind `pre → mid`, `mid → post` und `pre → post`. Ausgegeben werden absolute Veränderung, Richtung, Messzeitpunkte, Programmtag und Qualitätsflags. Prozentveränderung wird nicht als Standard verwendet. „Verbessert“ beziehungsweise „verschlechtert“ darf erst nach einer belastbaren Kalibrierung der Messfehler-/Veränderungsschwelle verwendet werden. Bis dahin bleibt die Einordnung unabhängig von der Zahl neutral.

## Triangulation

Onboarding-Selbstbericht, Development Index, validierte Assessments, Athlete Transfer, Coach-Beobachtung, Daily State und Completion bleiben getrennte Quellenfamilien. Übereinstimmung mehrerer Quellen ist Triangulation, aber weder Objektivität noch Kausalität. Completion beschreibt Nutzung, nicht mentale Qualität oder Wirkung.

## Pilotstatistik

Jeder Bericht führt mindestens:

- berechtigtes `n`, vollständige Paare, fehlende Paare und Dropout-Rate;
- Mittelwert, Median, Streuung und 95%-Konfidenzintervall;
- Verteilung verbessert / neutral / verschlechtert;
- Instrumentversion, QA-/Einwilligungsstatus und Claim-Klasse.

Gruppen unter `n = 5` werden serverseitig unterdrückt. `n = 5–9` wird als geringe Sicherheit markiert. Das 95%-Intervall ist eine transparente deskriptive Näherung; eine spätere statistische Analyse muss ihren vorab festgelegten Plan und die Verteilungsannahmen dokumentieren.
