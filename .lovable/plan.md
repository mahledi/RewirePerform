## Ziel

Den 56-Tage-Programm-Content so umschreiben, dass Sprache und Beispiele für **jede Sportart** funktionieren — Einzelsport (Boxen, Turnen, Schwimmen, Tennis, Leichtathletik, Klettern, Golf …) genauso wie Teamsport (Fußball, Basketball, Football, Volleyball, Handball …). Keine Individualisierung pro Nutzer, keine KI-Calls, kein neues Backend.

## Was sich ändert

Nur Text. Keine Tagesstruktur, kein Mechanismus, keine Phasenlogik, keine Anzahl Tasks/Fragen/Anker. Die `MatrixDay`-Skelette und der Resolver bleiben unverändert.

## Sprach-Mapping (Leitfaden)

| heute (teamsport-lastig) | neutral |
|---|---|
| Spiel, Match | Wettkampf / Einsatz |
| Trainer, Coach | Coach (bleibt — universell) |
| Team, Mannschaft, Mitspieler | Umfeld / Trainingsgruppe / die anderen |
| Gegner | Gegenüber / Anforderung / Aufgabe |
| Pass, Schuss, Tor, Possession, Drill, Scrimmage, Zweikampf | Aktion / Versuch / nächste Bewegung / nächste Wiederholung |
| Schiri, Schiedsrichter | Bewertende Instanz / Kampfrichter / Schiri (nur in optionalen Beispielen) |
| „im Spiel gegen X" | „im Wettkampf / unter Druck" |
| positionsspezifische Bilder (Innenverteidiger, Guard …) | rausziehen oder durch „in deiner Rolle" ersetzen |

Wo Bildhaftigkeit verloren geht, bekommen Sätze stattdessen **2 kurze Beispiele in Klammern** aus unterschiedlichen Sportwelten, z. B.:
> „… nach einer misslungenen Aktion (verpasster Wurf, gefallener Stand, Fehlpass, geblockter Schlag)."

So fühlt sich Boxer, Turner und Footballer gleichermaßen gemeint, ohne dass der Text technisch wird.

## Umfang

Drei Dateien, eine bleibt nur als Doku/Anker:

1. **`src/content/dailyContent.ts`** (2.476 Zeilen) — Hauptarbeit.
   Pro Tag (1–56) anpassen:
   - `tasks[*].title / why / detailedExplanation / concreteAction / whenToUse / microReframe / selfTalk / trigger`
   - `journal.questions[*].question + placeholder`, `gratitudePrompt`, `freeReflectionPrompt`
   - `selfTalkAnchors[*].text/when`
   - `comprehensionPool[*].stem + options + explanation` (am stärksten teamsportlastig — wichtigster Teil)
   - `variants.training / rest / match` (→ `match` bleibt Feldname, Text wird „Wettkampf")
   - `todayTrigger`, `coreShift`

2. **`src/lib/microAdjustment.ts`** — die vier hartcodierten Sport-Beispiele (Fußball/Basketball/Tennis/Leichtathletik) durch **einen neutralen Satz mit Mehrsport-Beispielen** ersetzen; Positions-Branch (`pickPositionExample`) liefert künftig immer `null` (deaktiviert), bis du das später lokal individualisierst.

3. **`src/lib/getDayContent.ts`** — `applyMicroAdjustments` deaktivieren bzw. den Sport-Hint sport-neutral formulieren (kein „Übertrag auf {sport}" mehr).

## Vorgehen (4 Batches, weil 2.476 Zeilen)

Damit nichts kippt und du nach jedem Batch prüfen kannst:

```text
Batch 1: Tag  1–14   (Phase 1 — Seed/Return)
Batch 2: Tag 15–28   (Phase 2 — Deepen/Convert)
Batch 3: Tag 29–42   (Phase 3 — Stress-Test/Transfer)
Batch 4: Tag 43–56   (Phase 4 — Integrate)
         + microAdjustment.ts + getDayContent.ts + Memory-Update
```

Pro Batch: nur Text-Felder ändern, Struktur/IDs/Counts (3 Tasks, 5–8 Fragen, korrekte `correctOptionId`) bleiben **identisch**. Nach jedem Batch ein kurzer Build-Check.

## Was bewusst NICHT passiert

- Keine neue Tabelle, keine Migration, keine Edge Function.
- Keine KI-Calls zur Laufzeit.
- Keine Änderung an Onboarding, Coach-Dashboard, Check-in-Logik, Streak-Logik.
- Keine Änderung der `MatrixDay`-Skelette (`primaryMechanism`, `lens`, `recurrenceType` …).
- Keine sportartspezifischen Varianten — bewusst eine einzige neutrale Version (deine lokale KI macht später die Individualisierung).

## Memory-Update danach

`mem://index.md` Core anpassen: „Sprache ist sportneutral — Einzel- wie Teamsport. Keine sportspezifischen Bilder im Basis-Content." Außerdem neue Memory-Datei `mem://constraints/sport-neutral-content` mit dem Mapping oben als Referenz für zukünftige Content-Edits.

## Aufwand-Realität

Ehrlich: Das ist **viel Fleißarbeit, aber gut machbar**. Die Comprehension-Pools sind der zeitaufwendigste Teil (~ 6 Fragen × 4 Optionen × 56 Tage ≈ 1.300 Strings). In 4 Batches sauber durchziehbar; pro Batch ein Tool-Loop.
