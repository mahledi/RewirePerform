# RewirePerform V1.1 — Handoff der vollständigen 56-Tage-Redaktion

Stand: 6. August 2026

Status: **isolierter vollständiger Inhaltsentwurf, nicht in Production und kein Wirkungsnachweis**

## Ergebnis

- Alle 56 Programmtage sind geschrieben.
- Jeder Tag zeigt genau einen führenden Cue.
- Jeder Tag enthält einen kurzen Science Bite, eine zusammenhängende Mission und ein Frage-für-Frage-Journal. Training und Wettkampf behalten die kurze Verständnisunterscheidung sowie den freien Abruf vor der Einheit.
- Ruhetage ersetzen Pre-Training durch eine geführte, tagesgenaue Visualisierung und verlangen keine erfundene heutige Sportanwendung.
- Training, Wettkampf und Ruhetag verändern nur die Ausführungsform, niemals Werkzeug, Cue oder Programmlogik.
- Training, Wettkampf und Ruhetag besitzen für jeden der 56 Tage ein passendes Journal. Ruhetage erhalten zwei manuell geschriebene Fragen zur mentalen Einheit; Wettkampffragen werden auf den echten Wettkampfkontext formuliert.
- Die zehn Golden Days und alle weiteren Tage wurden im abschliessenden 56-Tage-Audit gemeinsam nachgeschärft. Kanonische Cues, kontextneutrale Formulierungen und praktische statt redaktioneller Verständnisfragen gelten dadurch programmweit einheitlich.
- Fuer jeden der 56 Tage liegt eine kompakte Informationszusammenfassung fuer den Fall eines verpassten Tages vor. Sie fordert weder Nachholen noch nachtraegliche Anwendung.

## Belastung

- Science Bites: 37 bis 54 Wörter einschließlich Überschrift, Mittelwert 45,2 Wörter.
- Mission: zwei bis drei logisch notwendige Schritte in einem sichtbaren Block.
- Verständnis: an Training und Wettkampf genau eine Frage mit drei Optionen; nach der fordernden Ruhetag-Visualisierung keine zusätzliche Verständnisfrage.
- Journal: zwei bis drei tages- und kontextgenaue Fragen, einzeln sichtbar, danach ein gemeinsamer Dankbarkeitsblock mit mindestens acht Wörtern.
- Pre-Training: offene Erinnerung ohne sichtbaren Lösungshinweis; Cue und Anwendung erst nach `Erinnerung prüfen`.
- Ruhetag: zwei Minuten ruhige Atmung und danach drei aktiv zu durchlaufende Visualisierungsschritte. Jeder Timer muss beendet sein, bevor es weitergeht; Pause bleibt möglich. Die vorgestellte Szene wird nicht gespeichert. Nach erfolgreichem Speichern endet der Flow direkt im Dashboard; das Journal bleibt der getrennte Abendweg.

## Kanonischer Datenfluss

- Redaktionelle 56-Tage-Quelle: `src/prototypes/golden-days/programDayDrafts.ts`.
- Produktions-Gateway: `src/content/programV11.ts`.
- Produktionsauflösung: `src/lib/getDayContent.ts` → `resolveDay(...)`.
- Training, Ruhetag und Wettkampf: `src/prototypes/golden-days/contextDayJournals.ts`.
- Geführte Ruhetage: `src/prototypes/golden-days/restDayVisualizations.ts`.
- Die interne Vollvorschau importiert denselben `PROGRAM_V11_DRAFTS`-Export wie die Produktionsauflösung. Die ältere breite Fassung in `dailyContent.ts`, `playerDays.ts` und `scienceBites.ts` bleibt ausschließlich Migrations- und Crosswalk-Referenz.

## Quellenwahrheit

Der Crosswalk erfasst 1.302 strukturierte Bestandselemente einzeln:

| Quelle | Anzahl |
|---|---:|
| Tageslinsen, Mechanismen, Trigger und Core Shifts | 224 |
| Science Bites | 56 |
| Aufgaben | 168 |
| Journalfragen | 225 |
| Dankbarkeitsblöcke | 56 |
| freie Reflexionsblöcke | 56 |
| Self-Talk-Anker | 168 |
| Kontextvarianten | 168 |
| Verständnisfragen | 181 |

Jedes Element hat einen oder mehrere Zielprogrammtage sowie eine explizite schema-basierte Behandlung. Die sichtbare Fassung übernimmt nicht 1.302 Texte. Zusaetzlich wurde fuer jeden der 56 bisherigen Quelltage manuell entschieden, wo dessen beabsichtigte Funktion im neuen System direkt, verteilt oder gezielt verstaerkt weiterlebt. Dieser Quellen-Tagesaudit ersetzt weder echte Athletendaten noch den spaeteren unabhaengigen Content-Review.

## Qualitätsgrenzen

- Die bestehende Wohlbefinden-/Bereitschaftsabfrage im Team-Daily-Check-in bleibt ein eigener vorgelagerter Produktbestandteil. Die neue Inhaltsarchitektur ersetzt, kuerzt oder umgeht sie nicht.
- Keine Sportposition, persönliche Motivation oder konkrete heutige Drucksituation wird erfunden.
- Müdigkeit, Schmerz, reale Gefahr und ungeeignete Überforderung werden nicht als bloße mentale Schwäche umgedeutet.
- Purpose bleibt ein freiwilliger persönlicher Grund und wird vom System nicht behauptet.
- Identität und Confidence werden als mögliche Entwicklung aus wiederholbarem Verhalten beschrieben, nicht als bereits bewiesene Veränderung.
- Messungen sind Messpunkte, keine Personenbewertung und kein kausaler Wirksamkeitsbeweis.
- Private Journal- und Freitexte bleiben außerhalb von Coach-, Team- und Wirkungszusammenfassungen.
- Die Visualisierung speichert nur den bestehenden Abschlussstatus. Szene, Dauer und einzelne Schritte werden weder an Coaches noch an Evidence weitergegeben.

## Interne Prüfung

- Golden Days: `/internal/golden-days-preview`
- Alle 56 Tage: `/internal/program-content-preview`
- Beide Routen sind nur über das bestehende DEV-/Evidence-Gate erreichbar.
- Die Vollvorschau enthält synthetischen Redaktionszustand, keine echten Nutzerwerte, keine Speicherung und keine Netzwerkmutation.

Verifikationsstand dieser Korrekturrunde:

- fokussierte Inhalts-, Kontext-, Erinnerungs- und Preview-Regression: 52/52 Tests gruen;
- vollstaendige lokale CI: 105/105 Testdateien und 583/583 Tests sowie alle SQL-, Privacy-, Minderjährigen-, Tracking-, Lösch- und App-Store-Gates gruen;
- zentrale App-Wortmarke verifiziert: `Rewire` bleibt auf dunklen Flächen Off-White und auf hellen Flächen Midnight; `Perform` nutzt das gesperrte Rewire-Grün. Fließtext, Metadaten und Auth-/Guardian-Mailtemplates wurden in diesem Content-Scope nicht verändert;
- alle 56 Tage werden maschinell in Training, Ruhetag und Wettkampf aus derselben kanonischen Quelle aufgeloest;
- alle 56 Ruhetage besitzen zwei Minuten ruhige Atmung, drei aktive Visualisierungsschritte, genau einen festen Tagesanker und zwei eigene Journalfragen;
- Pre-Training und interne Vorschau bleiben bis `Erinnerung prüfen` gesperrt;
- realer Browser-Gegencheck auf 375 × 667, 390 × 844, 1024 × 1366 und 1366 × 1024 ohne horizontalen Seitenüberlauf; Ruhetag-Timer, Atmung plus drei Visualisierungsphasen, Tag-10-Wettkampfjournal und aktiver Abruf wurden sichtbar geprüft;
- der Fortschrittsstreifen der internen Vorschau steht nicht mehr in einem sichtbaren rechteckigen Rahmen;
- `npm run app:build` hat die vollständige CI erneut grün durchlaufen und anschließend erwartungsgemäß am Production-Target-Gate gestoppt, weil dieser isolierte Worktree keine bestätigten Production-Umgebungswerte enthält. Es fand kein Capacitor-Sync statt. Der native Release-Build bleibt Aufgabe des unabhängigen Readiness-Gates mit bestätigter Umgebung.

### Visuelle Referenz fuer die spaetere Integration

Die Feedback-Intelligence-Vorschau gilt nach Nutzerfeedback als Qualitaetsreferenz fuer ruhige Lichtfuehrung, hochwertiges Button-Feedback, beleuchtete Eingaben, einen sehr dezenten gruenen Schein und geringe visuelle Last. Der kurz aufpoppende Kreis im dortigen Danke-Moment wird ausdruecklich nicht uebernommen. Diese Referenz ist eine Designrichtung; Dateien oder Logik werden nicht unkontrolliert zwischen Worktrees kopiert.

Die Inventarerfassung und der manuelle Quellen-Tagesaudit sichern Nachvollziehbarkeit. Sie belegen nicht, dass jeder alte Satz sichtbar bleiben muss oder dass Athleten die neue Fassung bereits besser verstehen, behalten und anwenden.

## Bewusste Evidence-Grenze

Die Architektur setzt Abruf, verteilte Wiederholung, variable Szenen und klare Unterscheidungen plausibel stärker um als der bisherige Flow. Lokale Tests können Vollständigkeit, Konsistenz, Textlast und Bedienbarkeit prüfen. Ob Athleten Inhalte besser verstehen, behalten, übertragen oder dadurch ihre Leistung verändern, bleibt bis zu echten Nutzer- und Pilotdaten empirisch offen.
