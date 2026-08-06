# RewirePerform V1.1 — Handoff der vollständigen 56-Tage-Redaktion

Stand: 6. August 2026

Status: **isolierter vollständiger Inhaltsentwurf, nicht in Production und kein Wirkungsnachweis**

## Ergebnis

- Alle 56 Programmtage sind geschrieben.
- Jeder Tag zeigt genau einen führenden Cue.
- Jeder Tag enthält einen kurzen Science Bite, eine zusammenhängende Mission, eine kurze Verständnisunterscheidung, einen freien Abruf vor Training oder Wettkampf und ein Frage-für-Frage-Journal.
- Ruhetage entfernen Pre-Training und verlangen keine erfundene heutige Sportanwendung.
- Training, Wettkampf und Ruhetag verändern nur die Ausführungsform, niemals Werkzeug, Cue oder Programmlogik.
- Die zehn freigegebenen Golden Days bleiben inhaltlich unverändert; bei den Golden-Ruhetagen 2 und 15 wurde nur die bisher fehlende kontextunabhängige Pre-Training-Variante für andere reale Kalenderlagen ergänzt.

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

Jedes Element hat einen oder mehrere Zielprogrammtage sowie eine explizite Behandlung. Die sichtbare Fassung übernimmt nicht 1.302 Texte. Sie erhält deren beabsichtigte Funktion durch Verbindung, gezielte Neuformulierung oder optionale Tiefe, damit die inhaltliche Breite weniger belastend wirkt.

## Qualitätsgrenzen

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

Verifikationsstand dieser Redaktion:

- alle 56 Tage im realen Browser einzeln geöffnet;
- 375 × 667, 844 × 390, 1024 × 1366 und 1366 × 1024 ohne Seitenüberlauf oder Footer-Überdeckung;
- Ruhetag entfernt Pre-Training, Wettkampf zeigt Pre-Wettkampf, Training zeigt Pre-Training;
- 96 Testdateien mit 550 Tests sowie alle SQL-, Privacy-, Minderjährigen-, Tracking-, Lösch- und App-Store-Gates grün;
- vollständiger `app:build` mit synthetischer, netzwerkfreier Production-Zielkonfiguration grün;
- keine Preview-Route und kein neuer V1.1-Inhalt in Production-`dist` oder eingebettetem iOS-Public-Ordner.

## Bewusste Evidence-Grenze

Die Architektur setzt Abruf, verteilte Wiederholung, variable Szenen und klare Unterscheidungen plausibel stärker um als der bisherige Flow. Lokale Tests können Vollständigkeit, Konsistenz, Textlast und Bedienbarkeit prüfen. Ob Athleten Inhalte besser verstehen, behalten, übertragen oder dadurch ihre Leistung verändern, bleibt bis zu echten Nutzer- und Pilotdaten empirisch offen.
