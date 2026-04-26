# Micro-Adjustment Layer für Daily Experience

Ziel: Der Spieler bekommt das Gefühl „das Programm versteht meinen Sport, meine Position, meinen Zustand und meine Muster" — ohne dass die feste 56-Tage-Struktur, Tasks, Journalfragen, Science Bites oder Comprehension Checks verändert werden.

Die bestehende Stub-Funktion `applyMicroAdjustments()` in `src/lib/getDayContent.ts` wird durch einen sauberen, deterministischen Layer ersetzt, der nur **rahmt**, nie überschreibt.

## Was gebaut wird

### 1. Neue Datei `src/lib/microAdjustment.ts`

Reine TypeScript-Library, keine API-Calls, keine DB-Calls, keine KI.

**Types:**
```text
MicroAdjustmentInput {
  day: { dayNumber, lens, primaryMechanism, recurrenceType, phase }
  contextType: "training" | "rest" | "competition"
  profile?: { sport?, position?, fullName? }
  questionnaireSignals?: {
    resultFocus?: number        // 0..1
    selfCriticism?: number
    judgementFear?: number
    egoVisibility?: number
    confidence?: number
  }
  checkin?: {
    mood?: number               // 1..10
    energy?: number
    focus?: number
    stress?: number
  }
  recentJournalSignals?: Array<
    "self_doubt" | "pressure_after_mistake" | "fear_of_judgement"
    | "low_energy" | "result_focus" | "comparison" | "avoidance"
    | "frustration_uncontrollable"
  >
}

MicroAdjustmentOutput {
  athleteAddressLine: string        // neutrale Anrede
  sportExample: string              // 1 Satz Sportbezug, fallback generisch
  positionExample: string | null    // nur wenn Position bekannt
  stateEmphasis: string | null      // nur wenn Check-in vorhanden
  profileEmphasis: string | null    // nur wenn Fragebogensignal stark genug
  journalPatternEmphasis: string | null  // nur wenn Muster vorhanden
  microCue: string                  // immer gesetzt, sehr kurz
}
```

**Funktion:** `buildMicroAdjustmentContext(input): MicroAdjustmentOutput`

Pure, deterministisch, undefined-safe. Jeder fehlende Input → sauberer Fallback (Feld = null oder neutrale Variante). Keine Diagnose-Sprache, kein „du bist jemand, der…", keine Motivationsfloskeln.

**Rule-based Bausteine (intern, klein gehalten):**
- `pickSportExample(sport, day.primaryMechanism)` — kleines Mapping für Fußball, Basketball, Tennis, Leichtathletik, sonst generisch.
- `pickPositionExample(sport, position, day.primaryMechanism)` — Mapping für IV, Stürmer, Mittelfeld, Torwart (Fußball); Guard/Forward/Center (Basketball); sonst null.
- `pickStateEmphasis(checkin)` — low energy / high stress / low focus / frustration → je 1 vorbereiteter Satz.
- `pickProfileEmphasis(signals)` — nur das stärkste Signal über Schwellwert wird verwendet (max 1 Satz).
- `pickJournalEmphasis(patterns)` — nimmt häufigstes Muster, formuliert als „In deinen letzten Reflexionen tauchte häufiger auf: …".
- `pickMicroCue(day, state)` — kurzer Anker, max 4 Wörter, z. B. „Handlung vor Selbstbewertung", „Nur die nächste", „Direkt zurück".

### 2. Neue Komponente `src/components/daily/TodayForYou.tsx`

Kleine, ruhige Karte. Zeigt 2–4 kurze Sätze:

```text
┌─────────────────────────────────────┐
│ HEUTE FÜR DICH                      │
│                                     │
│ {athleteAddressLine}                │
│ {sportExample / positionExample}    │
│ {stateEmphasis | profileEmphasis |  │
│  journalPatternEmphasis}            │
│                                     │
│ Cue: {microCue}                     │
└─────────────────────────────────────┘
```

- Fehlende Felder werden ausgelassen, nicht mit Platzhaltern gefüllt.
- Keine Icons-Overload, eine kleine `Sparkles`-Markierung reicht.
- Style entsprechend bestehender `bg-gradient-card border-glow` Karten.

### 3. Integration in `src/components/dashboard/DailyCheckin.tsx`

- In `loadDay()` zusätzlich laden:
  - aktuellster Eintrag aus `daily_checkins` für heute (mood/energy/focus, falls vorhanden) — graceful, falls keiner existiert.
  - `questionnaire_responses.analysis` (bereits vorhanden im Dashboard-Flow, hier read-only).
  - letzte 5 `daily_journals`-Einträge → simple Pattern-Extraktion über Keyword-Matching (Whitelist deutscher/englischer Trigger-Wörter, kein KI-Call). Liefert Liste der `recentJournalSignals`.
- `buildMicroAdjustmentContext(...)` aufrufen, Ergebnis im State halten.
- `<TodayForYou />` rendern **oberhalb** des `TaskDashboard` (Step 2 / Aufgaben-Schritt) und im `ScienceBiteIntro` als kleine Vorschau-Zeile (nur `athleteAddressLine`).
- Kein Eingriff in `tasks`, `journal`, `comprehensionPool`, `scienceBite`.

### 4. Aufräumen `src/lib/getDayContent.ts`

- Bestehende Stub-Funktion `applyMicroAdjustments` bleibt bestehen für Sport-Hints in Task-Detail (nicht entfernen, kein Breaking Change), wird aber **nicht erweitert**.
- Neue Logik liegt komplett in `microAdjustment.ts` und wird vom Daily-Flow aufgerufen, nicht vom Resolver. So bleibt der Resolver pur.

## Was NICHT angefasst wird

- `src/content/dailyContent.ts`, `src/content/matrixDays.ts`, `src/content/scienceBites.ts`
- Tasks-Struktur, Journalfragen, Comprehension Pool
- Day-Assignment-Logik (`dayAssignment.ts`, `getCurrentProgramDay.ts`)
- Comprehension Check, Completion-Persistenz
- Coach-Sicht / RLS / Datenbank-Schema (keine Migration)
- Deep Profile, Settings, Auth, Dashboard-Hauptflow

## Datenquellen (nur bestehende)

| Quelle | Felder | Fallback |
|---|---|---|
| `profiles` | sport, position, full_name | neutrale Anrede |
| `questionnaire_responses.analysis` | scores, dominant_category | kein Profil-Emphasis |
| `daily_checkins` (heute) | mood/energy/focus_rating | kein State-Emphasis |
| `daily_journals` (letzte 5) | reflection/answers Text | keine Journal-Emphasis |

Pattern-Extraktion aus Journals: einfache Keyword-Whitelist (z. B. „Fehler", „Druck", „Vergleich", „müde", „Ergebnis"). **Kein** AI-Call, **keine** psychologische Interpretation, kein Speichern.

## Beispielausgaben (Tests im Kopf)

**Tag 20, Fußball, IV, hoher Stress, Journalmuster Selbstkritik:**
> Heute geht es um den Moment direkt nach einer unsauberen Aktion. Als Innenverteidiger ist das besonders sichtbar und hat schnell Folgen. In deinen letzten Reflexionen tauchte häufiger Selbstkritik nach Fehlern auf — heute reicht eine saubere Rückkehrhandlung. Cue: Fehler, nicht Ich.

**Tag 30, Stürmer, Match Day, Ergebnisdruck-Profil:**
> Heute wird der Ausgang lauter sein als sonst. Als Stürmer ziehen Abschluss und verpasste Chancen schnell aus dem Prozess. Dein Profil zeigt starken Ergebnisbezug — heute ist der Anker die nächste Handlung. Cue: Nur die nächste.

**Tag 43, kein Sport, niedrige Energie:**
> Heute muss Präsenz nicht groß sein. Allgemeiner Trainingsbezug: kleinere, schnellere Rückkehr reicht. Bei niedriger Energie zählt weniger Reibung statt maximalem Fokus. Cue: Direkt zurück.

**Tag 1, kein Profil, kein Check-in, kein Journal:**
> Heute geht es um {lens}. Such dir einen Moment im Training oder Alltag, der dazu passt. Cue: {dayCue}.

## Akzeptanzkriterien (Selbstcheck nach Implementierung)

- 56-Tage-Content unverändert (`dailyContent.ts`, `matrixDays.ts` unberührt).
- Tasks/Journal/Comprehension/ScienceBite werden nicht überschrieben.
- Neue Karte „Heute für dich" erscheint in DailyCheckin.
- Alle Felder fallen sauber zurück, wenn Daten fehlen — keine `undefined`-Texte, keine leeren Sätze.
- Keine neue Edge Function, keine DB-Migration, keine Breaking Changes.
- Code type-safe, keine `any` in der neuen Logik.

## Wie testen

1. Neuer User ohne Profil → nur generische Anrede + Cue.
2. Profil mit Sport=Fußball, Position=Stürmer → Sport- und Positionsbezug sichtbar.
3. Daily Check-in mit niedriger Energie speichern, neu öffnen → State-Emphasis sichtbar.
4. Mehrere Journal-Einträge mit „Fehler"/„Druck" anlegen → Journal-Emphasis sichtbar.
5. Coach-Sicht prüfen: keine Änderung, keine neuen Felder sichtbar.

## Geänderte / neue Dateien

- **neu** `src/lib/microAdjustment.ts`
- **neu** `src/components/daily/TodayForYou.tsx`
- **edit** `src/components/dashboard/DailyCheckin.tsx` (loadDay erweitern, Komponente einbinden)

Keine weiteren Files, keine Migrations, keine Edge Functions.
