## Problem

Die Landing Page hat 10 Vollbild-Sektionen (`py-32` = jeweils ~500px). Mehrere Inhalte wiederholen sich:

- **Team Pulse** wird in Hero, Process (Step 3), Mechanism Stack, Coach Section (zweimal: Feature + "Live Team Intelligence"-Block), und Evidence Stats erwähnt → **5 mal**.
- **Privacy / "Coach sieht nur Aggregate / n≥5"** kommt in Mechanism, Coach Section, Coach "Live Team Intelligence", Evidence Stats und der ganzen PrivacySection vor → **5 mal**.
- **Comprehension Check** taucht in Process, Mechanism, Players und Evidence auf → **4 mal**.
- **"Kein Motivationstalk / nicht dem Zufall überlassen"** in Hero, Why und CTA.
- **Hero** hat zwei volle Beschreibungs-Absätze, der zweite wiederholt den ersten.
- **WhySection** und **PlayersSection** sind beide "3 Karten + Intro" zum gleichen Thema (Druck/Fehler/Fokus).
- **CoachSection** hat ein 3-Karten-Grid UND einen großen "Live Team Intelligence"-Block direkt darunter, die exakt dasselbe sagen.

## Ziel

Von **10 Sektionen auf 7** reduzieren, Premium-Ton beibehalten, Wissenschaft & Disclaimer behalten, jedes Konzept nur **einmal** als Owner-Section haben.

## Neue Struktur

```text
1. Hero          — Positioning (gekürzt: 1 Absatz statt 2)
2. Why           — Das Problem + die 3 Skills (Druck/Emotion/Fokus)  ← merged WhySection
3. Process       — 56 Tage / 4 Schritte (Owner: Team Pulse)
4. Brain         — 4 Hirn-Mechanismen (Owner: Neurowissenschaft + Disclaimer)
5. Mechanism     — Mechanism Stack auf 4 Karten gekürzt (kein Team Pulse, kein Coach Loop)
6. Coach         — EINE konsolidierte Coach-Section (Owner: Coach-Sicht + Privacy)
7. Evidence      — Outcome-Layer + Science Guardrail (Owner: Messung)
8. CTA           — Final
```

**Entfernt:** `PlayersSection` (geht in Why auf), `PrivacySection` (Inhalt zieht in Coach-Section als Privacy-Liste rechts), separater "Live Team Intelligence"-Block (in Coach-Header integriert).

→ 10 Sektionen → 7 + Hero + CTA = **9 Bildschirme weniger Scrollen, ~30% kürzer.**

## Konkrete Änderungen pro Datei

**`src/pages/Index.tsx`**
- Imports/Renderings von `WhySection` (behalten, neu), `PlayersSection` (entfernen) und `PrivacySection` (entfernen) entsprechend anpassen.
- Reihenfolge: Hero → Why → Process → Brain → Mechanism → Coach → Evidence → CTA.

**`src/components/HeroSection.tsx`**
- Zweiten Absatz ("Kein Motivationstalk…") streichen.
- Im ersten Absatz "Team Pulse, Coach Dashboard" entfernen → bleibt: "…tägliche mentale Praxis, neurokognitive Prinzipien und messbare Entwicklung verbindet."

**`src/components/WhySection.tsx`**
- Bleibt strukturell (Intro + 3 Karten Druck/Emotion/Fokus). Übernimmt zusätzlich den Players-Spirit ("Spieler üben täglich, anders zu reagieren") als zweiten Satz im Intro. So entfällt PlayersSection komplett.

**`src/components/PlayersSection.tsx`**
- Datei bleibt liegen, wird aber nicht mehr importiert (kann später gelöscht werden).

**`src/components/ProcessSection.tsx`**
- Bleibt der **einzige** Owner von "Team Pulse" als Programmschritt. Kleinere Copy-Glättung (Step 3 bleibt explizit Team Pulse).

**`src/components/MechanismSection.tsx`**
- Von 6 auf 4 Karten kürzen: **entfernen**: "Check-ins" (= Team Pulse, gehört zu Process) und "Coach Feedback Loop" (gehört zu Coach-Section).
- Behalten: Journaling, Dankbarkeit, Comprehension, Discomfort & aMCC.
- Intro-Absatz auf 2 Sätze straffen, italic Footer behalten.

**`src/components/CoachSection.tsx`** (umgebaut)
- Drei-Karten-Grid bleibt (Team Pulse, Heute im Programm, Coach Toolkit) — hier ist Team Pulse erlaubt, weil Coach-Sicht.
- Großer "Live Team Intelligence"-Block **entfernt** (Inhalt überschneidet sich vollständig mit den 3 Karten).
- Stattdessen darunter ein zweispaltiges Privacy-Panel (linkes Statement + rechte Liste der 5 Privacy-Punkte aus PrivacySection). Damit wird PrivacySection obsolet.

**`src/components/PrivacySection.tsx`**
- Datei bleibt liegen, nicht mehr importiert.

**`src/components/EvidenceSection.tsx`**
- Stat-Pill **"Team Pulse — Daily" entfernen** (doppelt zu Process + Coach). 6 Stats → 5 Stats, Grid auf `lg:grid-cols-5` setzen.
- Intro-Absatz um einen Satz kürzen.
- Science Guardrail bleibt unverändert (das ist wichtiger Eigner-Text).

**`src/components/CTASection.tsx`**
- Subline "Für Teams, Coaches und Athleten…" auf einen Satz kürzen, damit nicht erneut die Why-Sektion paraphrasiert wird.

**`src/components/Navbar.tsx`**
- Anker bleiben gleich (`#why` neu hinzufügen, `#players`/`#privacy` entfallen). Sichtbare Links: System · Wissenschaft · Mechanismen · Coaches · Evidenz (5 Links, unverändert).

## Effekt

- Jedes Kernkonzept hat **genau einen** Eigentümer-Block.
- Vertikale Höhe der Page ca. **−30%**.
- Premium/Science-Ton, Disclaimer und Privacy-Substanz bleiben vollständig erhalten.
