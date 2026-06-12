## Ziel

Die gesamte App spricht final sportneutral. Ein Boxer, Turnerin, Schwimmer, Tennisspielerin oder Fußballer soll sich gleichermaßen angesprochen fühlen — in Landing, Auth, Onboarding, Daily Flow, Coach-Bereich, Admin, Demo und Inhalten.

## Sprachregeln (für alle Stellen)

- „Spieler" → „Athlet:innen" / „du" (je nach Kontext: Marketing → Athlet:innen, App-UI → du)
- „Mitspieler" / „Teamkamerad" → „Trainingspartner" oder „andere im Training"
- „Gegenspieler" → „Gegner" oder „Gegenüber"
- „Mannschaft" → „Team" (bleibt, ist sportneutral)
- Konkrete Ballsport-Beispiele („Pass spielen", „Tor", „Ballwechsel" als Pflichtbeispiel) → ersetzen durch neutrale Formulierungen („nächste saubere Handlung", „nächster Versuch", „nächste Aktion") oder offen halten („z. B. nächster Sprint, nächste Runde, nächster Punkt, nächster Versuch")
- Sport-Auswahl: bestehende Liste in Questionnaire (Turnen/Boxen/Schwimmen/Football/Tennis…) bleibt, ist bereits breit

Sport-/Positions-Anpassung im Hintergrund (personalization engine, copyBank, sportTaxonomy) bleibt unverändert — diese passen sich dynamisch dem Sport an. Es geht nur um Basis-Texte, die für alle gleich erscheinen.

## Betroffene Stellen

### 1. Marketing / Landing Components
- `src/components/PlayersSection.tsx` — Überschrift „Für Spieler" → „Für Athlet:innen"; alle „Spieler" → „Athlet:innen"
- `src/components/MechanismSection.tsx` — „Spielern/Spieler" → „Athlet:innen"
- `src/components/CoachSection.tsx` — „Spieler" → „Athlet:innen" (Privacy-Begründung bleibt inhaltlich)
- `src/components/ProcessSection.tsx` — „Spieler trainieren" → „Athlet:innen trainieren"
- weitere Landing-Components prüfen (HeroSection, DailySection, BrainSection, CTASection, EvidenceSection, WhySection, SpeakingSection, PrivacySection) und alle Treffer ersetzen

### 2. App-UI
- `src/pages/Auth.tsx` — „Spieler oder Co-Coach" → „Athlet:in oder Co-Coach"
- `src/pages/Admin.tsx` + `src/components/admin/AdminDayBrowser.tsx` — „Spieler-Vorschau / Spieler-Simulator / Spieler-Komponente" → „Athleten-Vorschau / Athleten-Simulator / Athleten-Komponente"
- `src/lib/programProgress.ts` (Code-Kommentar) — „pro Spieler" → „pro Athlet:in"

### 3. Demo
- `src/demo/DemoPage.tsx`, `src/demo/components/PlayerFlowDemo.tsx`, `src/demo/data/demoData.ts` — „Spieler-Flow" → „Athleten-Flow"; „Spieler" Vorkommen ersetzen. Dateinamen bleiben (kein User-Impact).

### 4. Inhaltliche Texte (Content)
- `src/content/playerDays.ts` (~71 Treffer) — alle „Gegenspieler" → „Gegner", „Mitspieler" → „Trainingspartner", „Spieler" → „Athlet:in/du"; ballsportspezifische Beispielsätze sportneutral umschreiben
- `src/content/scienceBites.ts` — vereinzelte „Gegner"-Stellen bleiben (sportneutral), explizite Ball-/Pass-Beispiele entfernen
- `src/content/matrixDays.ts` — „Gegner"-Lens bleibt; „Schiri" → „Schiedsrichter:in / Wertung / Schiri" oder neutraler („externe Bewertung")
- `src/content/coachToolkit.ts` — alle „Spieler" → „Athlet:innen"; Inhalt bleibt, da der Coach-Kontext sportübergreifend gilt
- `src/content/questionnaireV2.ts` — Option „Trainingspartner / Konkurrenz" bleibt (sportneutral); andere Fragen prüfen

### 5. QA / Helper
- `src/lib/qaSyntheticAnswers.ts` — Sportwert „Mittelfeldspieler" → neutraler Default („Athlet:in" oder leer); ist nur QA-Testdaten, niedrige Priorität

### 6. Was NICHT angefasst wird
- `src/content/dailyContent.backup.ts` — Backup, nicht aktiv
- `src/lib/personalization/copyBank.ts`, `sportTaxonomy.ts` — Sport-spezifische dynamische Personalisierung, soll genau das tun
- Dateinamen (`PlayersSection.tsx`, `PlayerFlowDemo.tsx`, `playerDays.ts`) — nur Inhalte, keine Renames, um Git-Diffs und Imports klein zu halten

## Vorgehen

1. Komponenten + Pages in parallelen Edits umschreiben (Punkt 1–3, 5)
2. Content-Dateien systematisch durchgehen (Punkt 4) — `playerDays.ts` ist der größte Block; dort pro Tag-Block prüfen, dass keine sport-fremden Bilder mehr stehen
3. Nach den Edits: `rg -ni "spieler|mitspieler|gegenspieler|ballwechsel|pass spielen"` über `src/` (ohne backup) — Ergebnis muss leer/nur false positives sein
4. Build/Typecheck läuft automatisch
5. Visuelle Stichprobe in Preview: Landing, Auth, Admin, Demo

## Offene Frage

Bevor ich starte: Soll ich konsequent „Athlet:innen" (Gendersternchen-Variante) nehmen, oder lieber neutral „Athleten" (generisches Maskulinum, kürzer) oder „du" (direkte Ansprache)? Aktuell lese ich auf eurer Seite eine Mischung; ich würde **„Athlet:innen" im Marketing** und **„du" in der App-UI** empfehlen — sag mir, falls du etwas anderes willst.
