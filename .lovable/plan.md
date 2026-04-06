

# Inner Excellence Kategorie hinzufügen

Du hast recht – Psychologie und Neurowissenschaft schließen sich nicht aus. Präsenz, Growth Mindset und Emotionskontrolle sind psychologische Konzepte, die direkt das Rewiring im Gehirn auslösen. Inner Excellence passt perfekt zum System.

## Duplikat-Analyse

Folgende Fragen werden **übersprungen**, da sie inhaltlich bereits abgedeckt sind:

| Vorgeschlagene Frage | Bereits vorhanden |
|---|---|
| Was lenkt dich am meisten ab? | `foc-02` (noch detaillierter) |
| Wie schnell kommst du nach Fehlern zurück? | `res-02` (Mental Recovery) |
| Warum spielst du deinen Sport? | `mot-01` |
| Was treibt dich am meisten an? | `mot-02` |
| Wie sehr beeinflusst ein Fehler deine nächste Aktion? | Dopplung mit ie-07 (gleiche Liste) → nur eine Version |
| Was bedeutet Gewinnen für dich? | `phil-01` (identisch) |

## Änderungen

**Datei:** `src/data/questionnaireData.ts`

1. Neue Kategorie `inner_excellence` mit Icon ✨ und Intro-Text, der Psychologie und Neurowissenschaft verbindet (z.B. "Inner Excellence ist die Brücke zwischen Sportpsychologie und Neurowissenschaft...")

2. **23 neue Fragen** (ie-01 bis ie-25), aufgeteilt in Subthemen:
   - **Glaube & Präsenz** (4): Leistungsverbesserungs-Glaube (scale), Leistungs-Einflussfaktor (choice), Präsenz-Häufigkeit (choice), Größte Ablenkung (choice: Fehler/Gegner/Ergebnis/Gedanken/Druck)
   - **Growth vs. Result Mindset** (4): Gutes Spiel Definition (choice), Verlieren mit Bestleistung (scale), Fehler-Einfluss aufs Spiel (scale), Angst vor Fehlern (scale)
   - **Ego vs. Inner Excellence** (3): Meinung anderer (scale), Vergleich mit anderen (choice), Spielantrieb (choice)
   - **Präsenz & Mentale Ruhe** (2): Nervosität (scale), Verhalten bei Druck (choice)
   - **Fehler & Feedback** (3): Fehler-Sicht (choice), Reaktion nach Fehler (choice), Fehler-Einfluss (scale)
   - **Motivation** (1): Liebe zum Sport (scale)
   - **Präsenz vs. Zeit** (2): Gedanken während Spielen (choice), Spielertyp (choice)
   - **Emotionskontrolle** (3): Frustration (scale), Emotions-Einfluss (scale), Ruhe bewahren (scale)
   - **Core** (3): Gewinnen vs. Wachsen (choice), Erfolg-Definition (text), Perfektes Spiel (text)

3. Kategorie wird zwischen `neurocognition` und `deep_profile` eingeordnet – als psychologische Vertiefung nach dem neurowissenschaftlichen Block.

