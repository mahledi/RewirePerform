# RewirePerform V1.1 — Handoff der vollständigen 56-Tage-Redaktion

Stand: 6. August 2026

Status: **isolierter vollständiger Inhaltsentwurf, nicht in Production und kein Wirkungsnachweis**

## Ergebnis

- Alle 56 Programmtage sind geschrieben.
- Jeder Tag zeigt genau einen führenden Cue.
- Jeder Tag enthält einen kurzen Science Bite, eine zusammenhängende Mission, eine kurze Verständnisunterscheidung, einen freien Abruf vor Training oder Wettkampf und ein Frage-für-Frage-Journal.
- Ruhetage entfernen Pre-Training und verlangen keine erfundene heutige Sportanwendung.
- Training, Wettkampf und Ruhetag verändern nur die Ausführungsform, niemals Werkzeug, Cue oder Programmlogik.
- Die zehn Golden Days und alle weiteren Tage wurden im abschliessenden 56-Tage-Audit gemeinsam nachgeschärft. Kanonische Cues, kontextneutrale Formulierungen und praktische statt redaktioneller Verständnisfragen gelten dadurch programmweit einheitlich.
- Fuer jeden der 56 Tage liegt eine kompakte Informationszusammenfassung fuer den Fall eines verpassten Tages vor. Sie fordert weder Nachholen noch nachtraegliche Anwendung.

## Belastung

- Science Bites: 37 bis 54 Wörter einschließlich Überschrift, Mittelwert 45,2 Wörter.
- Mission: zwei bis drei logisch notwendige Schritte in einem sichtbaren Block.
- Verständnis: genau eine Frage mit drei Optionen.
- Journal: zwei bis drei Ankerfragen, einzeln sichtbar, danach ein gemeinsamer Dankbarkeitsblock.
- Pre-Training: offene Erinnerung ohne sichtbaren Lösungshinweis; Cue und Anwendung erst nach `Erinnerung prüfen`.

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

## Interne Prüfung

- Golden Days: `/internal/golden-days-preview`
- Alle 56 Tage: `/internal/program-content-preview`
- Beide Routen sind nur über das bestehende DEV-/Evidence-Gate erreichbar.
- Die Vollvorschau enthält synthetischen Redaktionszustand, keine echten Nutzerwerte, keine Speicherung und keine Netzwerkmutation.

Verifikationsstand dieser Korrekturrunde:

- fokussierte Inhalts- und Preview-Regression: 25/25 Tests gruen;
- vollstaendige lokale CI: 96/96 Testdateien und 553/553 Tests sowie alle SQL-, Privacy-, Minderjährigen-, Tracking-, Lösch- und App-Store-Gates gruen;
- alle 56 Tage im mobilen Trainingsflow durch alle sechs Schritte geprueft: Ueberblick, Verstehen, Mission, Kurz pruefen, freier Abruf und Journal;
- alle 56 Tage zusaetzlich als Ruhetag und Wettkampf geprueft: Ruhetag ohne Pre-Training, Wettkampf mit Pre-Training, Programminhalt unveraendert;
- insgesamt 508 unterschiedliche Browseransichten ohne reproduzierbaren Textausfall oder horizontalen Ueberlauf;
- die gezielt verstaerkten Tage 36, 41, 50, 54 und der Abschluss 56 auf 1024 × 1366 sowie 844 × 390 durch alle Schritte geprueft;
- zwei einmalige Automationsmeldungen an Tag 7 und 43 waren in unmittelbarer Einzelwiederholung gruen und damit nicht reproduzierbar;
- der Fortschrittsstreifen der internen Vorschau steht nicht mehr in einem sichtbaren rechteckigen Rahmen; eine Regression prueft die rahmenlose Fassung.

- vollstaendiger `app:build` inklusive erneuter CI, Production-Target-Verifikation, Capacitor-iOS-Sync und Embedded-App-Pruefung gruen.

### Visuelle Referenz fuer die spaetere Integration

Die Feedback-Intelligence-Vorschau gilt nach Nutzerfeedback als Qualitaetsreferenz fuer ruhige Lichtfuehrung, hochwertiges Button-Feedback, beleuchtete Eingaben, einen sehr dezenten gruenen Schein und geringe visuelle Last. Der kurz aufpoppende Kreis im dortigen Danke-Moment wird ausdruecklich nicht uebernommen. Diese Referenz ist eine Designrichtung; Dateien oder Logik werden nicht unkontrolliert zwischen Worktrees kopiert.

Die Inventarerfassung und der manuelle Quellen-Tagesaudit sichern Nachvollziehbarkeit. Sie belegen nicht, dass jeder alte Satz sichtbar bleiben muss oder dass Athleten die neue Fassung bereits besser verstehen, behalten und anwenden.

## Bewusste Evidence-Grenze

Die Architektur setzt Abruf, verteilte Wiederholung, variable Szenen und klare Unterscheidungen plausibel stärker um als der bisherige Flow. Lokale Tests können Vollständigkeit, Konsistenz, Textlast und Bedienbarkeit prüfen. Ob Athleten Inhalte besser verstehen, behalten, übertragen oder dadurch ihre Leistung verändern, bleibt bis zu echten Nutzer- und Pilotdaten empirisch offen.
