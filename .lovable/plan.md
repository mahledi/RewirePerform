

# Plan: Vollständige Projekt-Dokumentation exportieren

Ich werde ein umfassendes Textdokument erstellen (`/mnt/documents/MindGame_Projektdokumentation.md`), das ALLES enthält, was ein externes KI-System braucht, um das Projekt vollständig zu verstehen. Hier ist der Inhalt, den ich zusammenstellen werde:

## Inhalt der Dokumentation

### 1. Projekt-Übersicht
- MindGame = wissenschaftlich fundiertes Mentaltraining-Programm für Sportler (14-18 Jahre)
- 56-Tage / 8-Wochen-Programm in 4 neurokognitiv periodisierten Phasen
- Dark-Theme Web-App (React/Vite/Tailwind), deutsche UI, Supabase Backend
- Zwei Rollen: Athlet + Coach

### 2. Komplettes Tech-Stack & Design System
- React 18, Vite 5, TypeScript 5, Tailwind CSS v3, Framer Motion
- Fonts: Space Grotesk (Headings), Inter (Body)
- Primary Color: HSL 160 84% 39% (Grün), Dark Background: HSL 220 20% 7%
- Alle CSS-Variablen und Custom Utilities

### 3. Komplettes Datenbank-Schema (alle 11 Tabellen)
- assessments, calendar_events, daily_checkins, deep_profile_assessments, feedback, personalized_tasks, profiles, program_settings, questionnaire_responses, team_members, teams, user_roles
- Alle Spalten, Typen, Relationships
- Enum: app_role (athlete | coach)
- DB Functions: get_team_stats, get_user_role, has_role

### 4. Alle Seiten & Routing (komplett)
- `/` Landing Page, `/auth` Login/Signup, `/questionnaire` Fragebogen, `/dashboard` Hauptseite, `/assessment` Wissenschaftliche Tests, `/coach` Trainer-Dashboard, `/deep-profile` Deep Profiling, `/progress` Fortschritt, `/settings` Info & Hilfe

### 5. Alle Edge Functions (4 Stück, vollständiger Code)
- `adapt-program` — KI-Aufgabengenerierung (Gemini Pro, ~600 Zeilen, sportartspezifisch)
- `analyze-questionnaire` — KI-Fragebogenanalyse (Gemini Flash)
- `generate-transformation-summary` — Baseline vs. Re-Test Zusammenfassung
- `team-mental-state` — Aggregierte Team-Statistiken für Coach

### 6. Fragebogen-System (komplett)
- 12 Kategorien, 78 Fragen (alle IDs, Texte, Typen, Optionen)
- Kategorien: identity, resilience, focus, emotions, motivation, competition, recovery, environment, philosophy, neurocognition, inner_excellence, deep_profile
- Deep Profile Question IDs: dp-01 bis dp-04

### 7. Wissenschaftliche Assessments (3 validierte Instrumente)
- CSAI-2R (17 Items, 3 Subskalen)
- SMTQ (14 Items, 3 Subskalen, reversed Items)
- Flow-Kurzskala FKS (13 Items, 3 Subskalen)
- Scoring-Algorithmus

### 8. Daily Check-in System
- 5-Step Flow: Mood → Energy → Knowledge Bites → Tasks → Reflection
- Knowledge-First Prinzip (alle Science Bites lesen vor Aufgabenfreischaltung)
- 3 Tasks pro Tag (1x aMCC-Challenge mit flame-Icon Pflicht)
- Auto-Regeneration bei fehlenden personalisierten Tasks
- Fallback-Tasks für Training/Ruhe/Wettkampf

### 9. aMCC-Training & Aufgabenstruktur
- Jede Aufgabe: title, description, steps[], duration, when_to_use, science_bite, icon, phase
- Icons: brain, eye, flame, heart, target, wind, sunrise, book, sparkles, shield
- Phasenabhängige Komplexität

### 10. Coach/Team-System
- 6-stellige Zugangscodes (auto-generiert)
- Privacy: Coach sieht NIE individuelle Antworten/Reflexionen/Stimmung
- Team Mental State: Aggregierte Energie/Stimmung/Fokus/Resilienz Trends
- AI Vibe Summary aus anonymisierten Reflexionen
- Inner Excellence Team-Durchschnitte

### 11. Auth & Rollen
- Email/Password Auth, Auto-Confirm aktiviert
- Rollen über user_roles Tabelle (NICHT auf profiles)
- DB Trigger: auto-assign role aus raw_user_meta_data bei Signup
- Session-Modell: localStorage session_id + auth user_id (Dual-Support)

### 12. Personalization Pipeline
- Fragebogen → KI-Analyse → Calendar Setup → KI-Aufgabengenerierung
- Inner Excellence Profil: growth_mindset_score, presence_level, ego_freedom_score, emotional_control_score, core_insight
- Sport/Position/Level-spezifische Aufgaben (American Football mit QB/WR/RB/Defense Beispielen, Fußball mit Torwart/Stürmer Beispielen)

### 13. Alle Komponenten-Dateien (Auflistung + Zweck)
### 14. Bekannte Patterns & Konventionen
### 15. Vollständiger Code aller Kernseiten und Edge Functions

## Umsetzung

Ein einzelnes Markdown-Dokument (~150-200KB) mit allem oben Genannten, generiert als `/mnt/documents/MindGame_Projektdokumentation.md`.
