# Rest-Day Visualization Feedback – Producer Handoff 1.1

Stand: 7. August 2026
Status: `LOCAL_DRAFT_NOT_ACTIVATED`

## Ergebnis

Die vier Feedback-Checkpoints an Tag 10, 24, 39 und 55 enthalten jeweils exakt
zwei Fragen zur Visualisierung am Ruhetag. Sie sind Teil der
jeweiligen Fragefolge und kein nachträglicher Zusatzblock.

| Tag | Auswertungsfokus | Fragen |
| --- | --- | --- |
| 10 | Führungsklarheit und erste praktische Nutzung | `d10_rest_visualization_guidance_clarity`, `d10_rest_visualization_practical_access` |
| 24 | Führung durch die konkrete Sportsituation und spätere Handlung | `d24_rest_visualization_guidance_clarity`, `d24_rest_visualization_practical_access` |
| 39 | selbstständiger Satzabruf in der Sportsituation und konkrete Anwendung | `d39_rest_visualization_self_direction`, `d39_rest_visualization_practical_access` |
| 55 | rückblickende Integration und Weiternutzungsabsicht | `d55_rest_visualization_integration`, `d55_rest_visualization_continuation_intent` |

Alle acht Fragen:

- nutzen eine strukturierte Fünferantwort plus `not_used` mit dem sichtbaren Text
  `Noch nicht genutzt`;
- markieren `not_used` als `NOT_APPLICABLE` und nie als negative Bewertung;
- bieten unverändert freiwillig `+ Kurz etwas dazu sagen` nach separater
  Text-Einwilligung;
- funktionieren strukturiert auch ohne Text-Einwilligung;
- erfassen ausschließlich subjektive Nutzungserfahrung und erlauben keine
  Wirkungs-, Gehirn-, Performance- oder Kausalaussage.

## Vergleichssemantik

Direkt vergleichbar bleiben nur Bedeutungen, die über Checkpoints stabil genug
sind:

- Führungsklarheit: Tag 10 und 24;
- praktische Zugänglichkeit: Tag 10, 24 und 39.

Selbstständige Nutzung an Tag 39, rückblickende Integration an Tag 55 und die
Weiternutzungsabsicht an Tag 55 sind getrennte Konstrukte. Jarvis oder ein
anderer Consumer darf sie nicht als denselben Längsschnittscore behandeln.

## Content- und Fragebogen-Pins

- kanonischer Produktions-Content und finaler dreistufiger Rest-Day-Vertrag:
  `47519c273f30e73781b827645c726be8e9713db4`;
- kanonische Quelle für Preview und echten `resolveDay`-/`DailyCheckin`-Pfad:
  `PROGRAM_DAY_DRAFTS` über `src/content/programV11.ts`;
- die früheren Pins `d5c4f15` und `1afd04c` sind durch den finalen
  Rest-Day-Content-Handoff ersetzt und keine gültige Feedback-Abhängigkeit mehr;
- Content-Version: `feedback-intelligence-content-v1.1.2`;
- Fragebogen-Versionen: `feedback-d10-v1.1.2`, `feedback-d24-v1.1.2`,
  `feedback-d39-v1.1.2`, `feedback-d55-v1.1.2`;
- die vollständigen Fragebogenpayloads und alle vier Tageskontexte tragen
  SHA-256-Pins.

Der finale Flow gibt die Sportsituation vor. Deshalb fragen die Items nicht
mehr nach dem Aufbau einer frei gewählten eigenen Szene. Sie prüfen nun die
subjektive Klarheit der vorgegebenen Sportsituation, den Abruf des heutigen
Satzes und die daraus folgende Handlung. IDs, Skalen und die neutrale
`Noch nicht genutzt`-Option bleiben stabil.

Tag 55 beginnt unverändert mit `d55_free_recall_level`. Die beiden
Visualisierungsfragen stehen erst danach und können weder Cue, Mission noch
Antwortstruktur vor dem freien Abruf sichtbar machen. Insbesondere werden vor
der ersten Antwort weder konkrete Handlungen noch Qualitätsbeispiele oder eine
fertige Standardformulierung gezeigt.

## Datenschutz- und Aktivierungsgrenze

Consent, Under-16-Guardian-Gate, Widerruf, Löschung, Rohtexttrennung und
Machine-Export wurden nicht gelockert. Private Journaltexte bleiben vollständig
ausgeschlossen. Die Registry-Migration hält alle Kampagnen auf `draft`.

Nicht Bestandteil dieses Handoffs sind Production, Push, Merge, Deployment,
echte Machine-Reads, Credentials oder Jarvis-Aktivierung. Diese Grenzen bleiben
fail-closed und benötigen jeweils eine separate Freigabe.
