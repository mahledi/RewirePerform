# QA: Fragebogen-Skip für Test-Spieler

## Ziel
Für QA-Test-Accounts (Profile mit `is_test_user = true`) den 78-Fragen-Fragebogen mit einem Klick überspringen, damit du direkt den täglichen Flow testen kannst.

Echte Spieler sind davon **nicht** betroffen — sie sehen den Skip-Button nicht und durchlaufen den Fragebogen ganz normal.

## So funktioniert es

Auf der Fragebogen-Intro-Seite erscheint **nur für QA-Test-User** ein zusätzlicher Button „Fragebogen überspringen (QA)".

Beim Klick:
1. Es wird ein synthetischer „neutraler" Antwort-Satz für alle 78 Fragen erzeugt (mittlere Werte / sinnvolle Defaults pro Fragetyp).
2. Die bestehende deterministische Analyse läuft darüber → erzeugt eine vollwertige `analysis` (Mental Score, Stärken, Entwicklungsfelder, Tasks etc.).
3. Eine vollständige `questionnaire_responses`-Zeile wird gespeichert (`is_complete = true`, mit Analyse), Sport/Position werden auf sinnvolle QA-Defaults gesetzt.
4. Weiterleitung direkt zu `/dashboard` — täglicher Flow ist sofort testbar.

## Sicherheit / Begrenzung
- Button rendert clientseitig nur, wenn `profiles.is_test_user = true` für den eingeloggten User.
- Echte User sehen nichts und werden vom Skip nicht beeinflusst.
- Es werden **keine** Tabellen, RLS-Policies oder echten Daten verändert.
- Keine neuen Edge Functions, keine AI-Aufrufe.

## Technische Details
- Neue Datei `src/lib/qaSyntheticAnswers.ts`: erzeugt einen Default-Antwort-Satz aus `questionnaireData.ts` (für jede Frage je nach Typ: mittlere Skala, erste Single-Choice-Option, leere/neutrale Multi-Choice, Standard-Text).
- `src/components/questionnaire/QuestionnaireIntro.tsx`: lädt `is_test_user` aus dem eigenen Profil; rendert den QA-Skip-Button konditional.
- Klick-Handler: ruft `buildDeterministicQuestionnaireAnalysis` mit den synthetischen Antworten + QA-Sport-Defaults, schreibt eine komplette `questionnaire_responses`-Zeile (analog zur Logik in `QuestionnaireResults.tsx`), räumt offene Drafts ab, navigiert zu `/dashboard`.
- Keine Änderungen am normalen Fragebogen-Flow.

## Antwort auf deine Frage
Nein, der Fragebogen ist für den Flow nicht zwingend nötig — solange am Ende eine `questionnaire_responses`-Zeile mit `analysis` in der DB liegt, funktioniert das Dashboard und der gesamte tägliche Flow. Der Skip erfüllt genau das.
