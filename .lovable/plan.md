## Ziel

Du willst im Admin-Bereich **jeden der 56 Tage exakt so durchklicken können, wie ein Spieler ihn sieht** — Wort für Wort, Schritt für Schritt, inklusive Stimmungs-Slider, Tasks, Journal-Fragen, Comprehension Check, Science Bite und allem dazwischen. Aktuell ist der `Tage`-Tab nur eine eigene Vorschau-Karte (`AdminDayPreview`), die mit der echten Spieleroberfläche fast nichts gemeinsam hat — deshalb wirkt er falsch und „kaputt".

## Kernidee

Statt eine eigene Admin-Vorschau zu pflegen, **wiederverwenden wir die echte Spielerkomponente `DailyCheckin`** (das ist die 7-Step-Flow-Komponente, die der Spieler im Dashboard sieht). Die einzige Änderung: ein „Preview-Modus", der

- nichts in die Datenbank schreibt
- jeden beliebigen `dayNumber` und `eventType` (Training / Rest / Wettkampf) erzwingen kann
- frei navigierbar ist (auch rückwärts, auch Schritte überspringen)

So sieht der Admin **garantiert dasselbe** wie ein Spieler — weil es derselbe Code ist.

## Was im Detail gebaut wird

### 1. `DailyCheckin` Preview-Mode-fähig machen

Neue optionale Props:

- `previewMode?: boolean` — wenn `true`: keine `supabase`-Writes (kein `ensureAssignment`, `upsertCompletion`, `upsertComprehension`, kein `daily_checkins`/`daily_journals`-Insert), keine Toasts, keine Navigation am Ende
- `previewDayNumber?: number` — überschreibt `getCurrentProgramDay()` und lädt direkt diesen Tag
- `previewEventType?: EventType` — überschreibt den vom Kalender abgeleiteten Typ
- `onClose` darf weiterhin „zurück zur Tagesliste" bedeuten

Im Code: an jeder Stelle, wo geschrieben wird, ein `if (previewMode) return;` davor. AI-Calls für `microAdjustment` werden im Preview-Mode übersprungen (Tag wird mit `null`-Adjustment angezeigt — das ist genau das, was ein neuer Spieler vor dem ersten Speichern sieht).

### 2. Admin-Tab „Tage" komplett ersetzen

`AdminDayBrowser` bleibt als linke Liste (56 Tage, Phasen-Filter, Suche), aber:

- **Klick auf einen Tag → Vollbild-Dialog** statt der bisherigen kleinen Preview-Karte
- Im Dialog: Header-Leiste mit `Tag X · Phase Y · Woche Z` + Toggle für `Training / Rest / Wettkampf` + Button „nächster Tag / vorheriger Tag"
- Darunter: `<DailyCheckin previewMode previewDayNumber={X} previewEventType={...} onClose={...} />` — also die echte Spieler-UI

`AdminDayPreview.tsx` wird gelöscht (nicht mehr nötig).

### 3. Zusätzliche Admin-Komfortfeatures im Tage-Browser

- **Sprung-Leiste oben**: „Gehe zu Tag …" Input + Buttons „Phase 1 Start (Tag 1)", „Phase 2 Start (Tag 15)", „Phase 3 Start (Tag 29)", „Phase 4 Start (Tag 43)"
- **Step-Indikator** im Dialog: „Schritt 3 / 7 — Tasks" — damit du weißt, wo im Flow du gerade bist
- **„Alle Schritte sichtbar"-Toggle**: optional alle 7 Steps untereinander statt einzeln durchklicken — für schnelles Wort-für-Wort-Korrekturlesen
- Badge „PREVIEW – nichts wird gespeichert" sichtbar im Dialog

### 4. Restlicher Admin-Bereich

Du hast erwähnt „generell ist alles im Admin kaputt". Ich gehe in diesem Plan **nur den Tage-Tab** an, weil das dein konkretes Hauptanliegen ist und der Rest (Übersicht, Teams, Wirksamkeit, Feedback, Exporte, Systemstatus) auf RPCs basiert, die laut Code grundsätzlich funktionieren. Wenn beim Testen nach dem Fix konkrete andere Tabs Fehler werfen, fixe ich die in einer Folgerunde gezielt — sonst riskieren wir blinde Änderungen.

## Technische Übersicht

```text
src/
├── components/
│   ├── admin/
│   │   ├── AdminDayBrowser.tsx        ← umgebaut: Vollbild-Dialog + Sprungleiste
│   │   └── AdminDayPreview.tsx        ← GELÖSCHT
│   └── dashboard/
│       └── DailyCheckin.tsx           ← + previewMode, previewDayNumber,
│                                        previewEventType Props; alle DB-Writes
│                                        und AI-Calls hinter `if (previewMode)`
└── pages/
    └── Admin.tsx                      ← unverändert (nutzt AdminDayBrowser)
```

Risiko: `DailyCheckin` ist 719 Zeilen und der zentrale Spieler-Flow. Die Änderungen sind aber rein additiv (neue optionale Props mit Default `false`) — bestehendes Spieler-Verhalten bleibt 1:1 identisch.

## Outcome

Nach dem Fix kannst du im Admin → Tab „Tage" jeden Tag 1–56 anklicken und siehst **exakt** den Spieler-Check-in: Stimmung & Energie, alle Slider, Science Bite, Today For You, jede Task mit Detail-Ansicht und Reframe-Step, Journal-Fragen mit Voice-Input, Dankbarkeit, Comprehension Check mit den realen Antwortmöglichkeiten — ohne dass irgendetwas in die Datenbank geschrieben wird. Du kannst zwischen Training/Rest/Wettkampf und zwischen Tagen wechseln, ohne den Dialog zu schließen.