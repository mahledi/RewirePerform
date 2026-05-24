## Ziel
1. Im Journal (`/journal`) jedes Textfeld mit Spracheingabe ausstatten und Sprechen als Standard-Modus framen.
2. Auf der Startseite an passender Stelle eine kurze, fundierte Begründung einbauen, **warum** gesprochen statt getippt wird.

---

## Wissenschaftlicher Hintergrund (das geht in den Landing-Block)

Sprechen ≠ Tippen. Wenn man laut über sich selbst redet, sind gleichzeitig **mehr neuronale Netzwerke aktiv** als beim stillen Schreiben:

- **Motorischer + auditorischer + sprachlicher Cortex** feuern parallel (Broca, Wernicke, prämotorisch, auditiver Rückkopplungs-Loop). Das erzeugt eine **multimodale Spur** desselben Gedankens → stärkere Konsolidierung im Hippocampus (Encoding-Variability-Effekt).
- **"Self-distancing through speech"** (Kross et al., Univ. Michigan): Wer über sich selbst spricht, aktiviert den **medialen präfrontalen Cortex** stärker und reguliert die Amygdala runter. Folge: weniger Grübeln, klarere Einsicht.
- **Hebbian Plasticity / "Cells that fire together wire together"** (Donald Hebb, 1949; Bliss & Lømo, LTP): Synchrone Co-Aktivierung mehrerer Netzwerke beschleunigt synaptische Bahnung. Sprechen liefert genau diese Synchronität.
- **Generation Effect** (Slamecka & Graf, 1978): selbst-generierte verbalisierte Inhalte werden deutlich besser erinnert als gelesene.
- **Insight via Verbalisation** (Schooler, Ohlsson): laut formulieren zwingt zur Sequenzierung impliziter Gedanken → "Aha-Momente" entstehen *während* des Sprechens, nicht davor.

Kurz für Athleten 14–18: *„Wenn du es laut aussprichst, baut dein Gehirn schneller neue Verbindungen. Du denkst nicht nur — du verdrahtest."*

---

## Änderungen

### 1. `src/pages/Journal.tsx`
- `VoiceInput` neben jedes Textfeld einbauen:
  - Tagesfragen (`j.questions.map`)
  - Dankbarkeit (`gratitude`)
  - Free Reflection (`freeReflection`)
- `onTranscript` schreibt direkt in den jeweiligen State (akkumulierend, gemäß bestehender VoiceInput-Logik).
- Kleiner Hinweis-Banner ganz oben unter der "Heutigen Linse":
  > „Sprich deine Antworten ein. Beim lauten Verbalisieren verknüpft dein Gehirn neue Bahnen schneller als beim Tippen."
  Mit `Mic`-Icon, dezent gestaltet (gleicher `bg-gradient-card` Stil).
- Tippen bleibt jederzeit möglich (Textarea bleibt erhalten).

### 2. Landing — neue Mini-Section „Warum sprechen?"
- **Platzierung:** direkt nach `MechanismSection` (passt thematisch zum Neuro-Mechanismus), vor `CoachSection`.
- Entweder als neue Komponente `src/components/SpeakingSection.tsx` oder als Block innerhalb `MechanismSection`. **Empfehlung: neue Komponente** für klare Trennung.
- Inhalt (kurz, max ~60 Wörter sichtbar + 3 Kacheln):
  - Headline: *„Warum eingesprochen wird."*
  - Sub: *„Sprechen aktiviert mehr Netzwerke gleichzeitig — Sprache, Motorik, Hören, Selbst-Reflexion. Das beschleunigt synaptische Verbindung (Hebbian Plasticity)."*
  - 3 kleine Karten:
    1. **Mehr Netzwerke** — Broca + Wernicke + auditiver Loop feuern parallel.
    2. **Klarere Einsicht** — Selbst-distanzierte Sprache reguliert die Amygdala (Kross).
    3. **Schnellere Verdrahtung** — Generation Effect + LTP: verbalisierte Gedanken bleiben.
  - Visueller Stil: dark theme, green accent, `Space Grotesk` Heading, `Mic` + Brain-Icons, gleiche Karten-Optik wie `MechanismSection`.
- In `src/pages/Index.tsx` einhängen mit `id="speaking"`.

### 3. Memory-Update
Neue Memory-Datei `mem://features/voice-journal` ergänzen + Index updaten:
- Journal unterstützt Voice-Input mit wissenschaftlicher Begründung (Hebbian, Generation Effect, Self-distancing). Sprechen ist der bevorzugte Modus, Tippen bleibt Fallback.

---

## Was NICHT geändert wird
- Bestehende Save-Logik, Schema (`daily_journals`) unverändert.
- Keine Backend-Änderungen, keine STT-Server-Integration — `VoiceInput` nutzt bereits die Web Speech API.
- `VoiceInput.tsx` selbst wird nicht angefasst.
- Andere Landing-Sections bleiben unberührt.

---

## Offene Frage an dich
Soll der Landing-Block:
- **(a)** eine eigene neue Section sein (klar sichtbar, eigenes Scroll-Ziel), oder
- **(b)** als Sub-Block in die bestehende `MechanismSection` integriert werden (kompakter, weniger neue Sektionen)?

Default-Empfehlung: **(a)** — weil das Thema „Sprechen statt Tippen" ein eigenständiges Verkaufsargument ist und sich vom Mechanismus-Narrativ abhebt.