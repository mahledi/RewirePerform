# Rest-Day Visualization Feedback – Producer Handoff 1.1

Stand: 6. August 2026
Status: `LOCAL_DRAFT_NOT_ACTIVATED`

## Ergebnis

Die vier Feedback-Checkpoints an Tag 10, 24, 39 und 55 enthalten jeweils exakt
zwei Fragen zur mentalen Visualisierungseinheit am Ruhetag. Sie sind Teil der
jeweiligen Fragefolge und kein nachträglicher Zusatzblock.

| Tag | Auswertungsfokus | Fragen |
| --- | --- | --- |
| 10 | Führungsklarheit und erste praktische Nutzung | `d10_rest_visualization_guidance_clarity`, `d10_rest_visualization_practical_access` |
| 24 | Verbindung mit dem Tagesinhalt und konkrete spätere Handlung | `d24_rest_visualization_guidance_clarity`, `d24_rest_visualization_practical_access` |
| 39 | selbstständiger Szenenaufbau und konkrete Anwendung | `d39_rest_visualization_self_direction`, `d39_rest_visualization_practical_access` |
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

- kanonischer Produktions-Content: `d5c4f15cc005ab7ed958a9900cf6b9607f397950`;
- `1afd04c` ist Notification-/Routing-UX und ausdrücklich keine
  Feedback-Abhängigkeit;
- Content-Version: `feedback-intelligence-content-v1.1.0`;
- Fragebogen-Versionen: `feedback-d10-v1.1.0`, `feedback-d24-v1.1.0`,
  `feedback-d39-v1.1.0`, `feedback-d55-v1.1.0`;
- die vollständigen Fragebogenpayloads und alle vier Tageskontexte tragen
  SHA-256-Pins.

Tag 55 beginnt unverändert mit `d55_free_recall_level`. Die beiden
Visualisierungsfragen stehen erst danach und können weder Cue, Mission noch
Antwortstruktur vor dem freien Abruf sichtbar machen.

## Datenschutz- und Aktivierungsgrenze

Consent, Under-16-Guardian-Gate, Widerruf, Löschung, Rohtexttrennung und
Machine-Export wurden nicht gelockert. Private Journaltexte bleiben vollständig
ausgeschlossen. Die Registry-Migration hält alle Kampagnen auf `draft`.

Nicht Bestandteil dieses Handoffs sind Production, Push, Merge, Deployment,
echte Machine-Reads, Credentials oder Jarvis-Aktivierung. Diese Grenzen bleiben
fail-closed und benötigen jeweils eine separate Freigabe.
