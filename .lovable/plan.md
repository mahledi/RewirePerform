

# Knowledge-First Flow im Daily Check-in

## Konzept

Neuen Step zwischen Energy (Step 1) und Tasks (Step 2) einfügen: **"Dein Wissen für heute"** — zeigt die Science Bites der heutigen Aufgaben als eigenständige Lern-Sektion, bevor die Übungen freigeschaltet werden.

## Flow (vorher → nachher)

```text
VORHER:                    NACHHER:
0. Mood                    0. Mood
1. Energy                  1. Energy
2. Tasks                   2. Knowledge (NEU)
3. Reflection              3. Tasks
4. Done                    4. Reflection
                           5. Done
```

## Änderungen

### 1. `src/components/dashboard/DailyCheckin.tsx`

**Step-Logik anpassen** (Steps von 0–4 auf 0–5):
- Step 2 wird **KnowledgeStep**: Zeigt die Science Bites aller 3 heutigen Aufgaben als Karten (Titel + Neurowissenschaft + Quelle). Kein Aufgaben-Detail, nur das "Warum".
- Jede Karte muss gelesen/aufgeklappt werden, bevor der "Bereit für die Übungen" Button aktiv wird (einfacher Read-Tracker: alle 3 Karten angetippt = ready).
- Button-Text: **"Bereit für die Übungen"** statt "Weiter".
- Step 3 = bisheriger TaskDashboard (war Step 2)
- Step 4 = Reflection (war Step 3)
- Step 5 = Done (war Step 4)
- Bottom-Navigation Dots: 5 statt 4
- `saveCheckin()` bei Step 4 statt 3 auslösen

**Neue Komponente `KnowledgeStep`** (inline im selben File):
- Überschrift: "Verstehe, was du trainierst"
- Untertext: "Bevor du loslegst – hier ist die Wissenschaft hinter deinen heutigen Übungen."
- 3 aufklappbare Karten, je eine pro Task:
  - Task-Icon + Titel
  - `science_bite` Text (prominent, nicht versteckt)
  - Kleines Checkmark wenn gelesen
- Wenn alle 3 gelesen → Button "Bereit für die Übungen" wird aktiv (primary color, glow)

### 2. `supabase/functions/adapt-program/index.ts`

**Prompt anpassen** — Science Bites ausführlicher machen, besonders in Phase 1+2:

Neue Regel nach dem bestehenden SCIENCE BITE Block (~Zeile 65):
```
WISSENS-TIEFE (phasenabhängig):
- Phase 1–2: Science Bite = 4–5 Sätze. Erkläre den Mechanismus so, dass ein 14-Jähriger es versteht UND sich schlauer fühlt. Verwende Analogien ("Stell dir vor, dein Gehirn ist wie..."). Der Athlet soll VERSTEHEN warum er das macht, bevor er es tut.
- Phase 3–4: Science Bite = 2–3 Sätze. Kurz und prägnant – der Athlet kennt die Grundlagen bereits.
```

## Ergebnis

Der Athlet sieht zuerst die Wissenschaft hinter den Übungen, bestätigt dass er sie verstanden hat, und geht dann erst in die Aufgaben. In Phase 1+2 sind die Erklärungen ausführlicher, in Phase 3+4 kompakter.

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `src/components/dashboard/DailyCheckin.tsx` | Neuen Knowledge-Step (Step 2) einfügen, Steps verschieben, KnowledgeStep-Komponente, Navigation anpassen |
| `supabase/functions/adapt-program/index.ts` | Phasenabhängige Science Bite Tiefe im Prompt ergänzen |

