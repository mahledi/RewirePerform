# 5 Dankbarkeits-Zeilen im Journal – mit Pflicht-Minimum

## Was sich ändert
Das eine große Dankbarkeits-Textfeld im Tagesjournal (`/journal`) wird durch **5 kompakte einzeilige Eingaben** ersetzt – knapp untereinander. So entsteht visuell und psychologisch der Druck, wirklich fünf Dinge zu benennen.

„Tag abschließen" lässt sich erst speichern, wenn **jede der 5 Zeilen mindestens 6 Buchstaben** enthält. Solange das nicht erfüllt ist, ist der Button deaktiviert und zeigt: „Noch N Dankbarkeiten ausfüllen".

Pro Zeile bleibt Voice-Input (kompaktes Mic-Icon) erhalten.

## Keine Doppel-Abfrage anderswo
Geprüft: Dankbarkeit erscheint im User-Flow nur an dieser einen Stelle im Journal. Die normalen Tages-Reflexionsfragen (`questions`) enthalten keine zweite Dankbarkeitsfrage, und das ungenutzte `gratitudePrompt`-Feld wird nirgendwo gerendert. Programminhalte, Coach-Toolkit, Landing-Bezüge bleiben wie sie sind.

## UX-Detail
- Überschrift „Dankbarkeit" + 1-Zeilen-Hinweis: „Fünf konkrete Dinge. Jeweils mindestens ein paar Worte."
- 5 nummerierte schmale Inputs (`1.` … `5.`), kompakter Block, `gap-2`.
- Pro Zeile rechts ein kleines Mic-Icon, das in genau diese Zeile diktiert.
- Save-Button-Label dynamisch: „Noch 2 Dankbarkeiten ausfüllen" → „Tag abschließen".

## Speicherung
DB-Feld `daily_journals.gratitude` bleibt `string` (keine Migration). 5 Zeilen werden als Klartext mit `\n` getrennt gespeichert und beim Laden in 5 Felder zerlegt. Alte Einträge landen in Zeile 1, die übrigen bleiben leer.

Lokaler Draft speichert die 5 Zeilen ebenfalls als Array.

## Was nicht verändert wird
- Keine DB-Migration.
- Coach-Sichtbarkeit unverändert (Dankbarkeit bleibt privat).
- Andere Journal-Fragen, freie Reflexion, Verständnis-Check, restliches Layout, Auth, Check-in, Programmlogik – alles unverändert.

## Technische Details
Datei: `src/pages/Journal.tsx`
- State `gratitude: string` → `gratitudeList: string[]` (Länge 5).
- Helpers: `parseGratitude` / `serializeGratitude` / `countLetters` (Regex `\p{L}`, Min-6).
- `JournalDraft.gratitude` wird `string[]`; alte Drafts werden tolerant geparst.
- `handleSave` speichert `serializeGratitude(...)` und blockt, wenn nicht alle 5 Zeilen `countLetters >= 6`.
- UI: ersetzt das Gratitude-`<Textarea>` durch 5 `<Input>` + jeweils kompakter `<VoiceInput>`.
- Save-Button-`disabled` + Label an Vollständigkeit gekoppelt.

Keine weiteren Dateien betroffen.
