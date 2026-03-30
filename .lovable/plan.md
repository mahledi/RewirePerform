
Ziel: Kalender, Pre-Tests und Daily Check-in zuverlässig persistieren, damit erledigte Inhalte nicht erneut auftauchen.

1) Befund (aus Code + Daten)
- Daily Check-ins werden aktuell oft nicht gespeichert, weil `focus_rating` in der DB nur `1..10` erlaubt ist, der Code aber bei 0 erledigten Aufgaben `0` schreibt. Fehler wird im UI nicht abgefangen (trotzdem Erfolgsscreen).
- Kalender/Programm-Daten hängen primär an `session_id`; bei Session-Wechsel (LocalStorage neu) wirken Daten „weg“.
- In mehreren Flows wird `user_id` nicht konsistent mitgeschrieben (v. a. Kalender/Programmdaten), daher schlechte Wiederfindbarkeit.
- Assessment-Flow nutzt teils instabile Session-Ermittlung (Random-Fallback ohne Persistenz), was Zuordnung erschwert.

2) Datenmodell-Fix (Migration)
- `daily_checkins` Constraint für `focus_rating` auf `0..10` ändern (oder nullable + validiert im Code).
- Zusätzliche Eindeutigkeit für authentifizierte Check-ins: `UNIQUE(user_id, date)` (null bleibt für anonyme Fälle möglich).
- Einmaliges Backfill: `user_id` in `calendar_events`, `program_settings`, `personalized_tasks` (und ggf. `daily_checkins`) anhand vorhandener `session_id`↔`user_id` Zuordnung aus Assessments nachziehen.

3) Schreiblogik vereinheitlichen
- Bei allen Writes (Kalender-Setup, Event hinzufügen, Program-Settings, Tasks-Sync, Check-in, Assessments) `user_id` mitschreiben, wenn eingeloggt.
- Daily Check-in: bei eingeloggten Nutzern Upsert über `(user_id,date)`, sonst über `(session_id,date)`.
- Erfolgsscreen im Check-in nur nach erfolgreichem DB-Write anzeigen; bei Fehler Toast + im Formular bleiben.

4) Leselogik robust machen
- Dashboard-Setup und Status-Abfragen nicht nur nach `session_id`, sondern bevorzugt nach `user_id` (mit Session-Fallback).
- Pre/Post-Test-Status und Post-Comparison ebenfalls user-basiert + Session-Fallback, damit alte/wechselnde Sessions nicht zu „offen“-Bannern führen.
- `Assessment.tsx` auf dieselbe stabile `getOrCreateSessionId()`-Logik umstellen (kein unpersistenter Random-Fallback).

5) UX/Fehlertransparenz
- Alle relevanten Inserts/Upserts mit Error-Handling + sichtbarer Fehlermeldung.
- Nach Save/Close immer Status-Refresh (Check-in + Assessments + Setup) ausführen.

6) Verifikation (End-to-End)
- Fall A: Check-in ohne erledigte Aufgaben speichern → muss persistieren und CTA am selben Tag verschwinden.
- Fall B: Kalender anlegen, App neu laden, erneut einloggen → Kalender bleibt.
- Fall C: Pre-Tests abschließen → Banner verschwindet; erscheint erst wieder nach 28 Tagen für Post-Tests.
- Fall D: „Nächster Tag“-Logik prüfen: Check-in erst am Folgetag wieder sichtbar.

Technische Details (gezielt betroffene Stellen)
- `src/components/dashboard/DailyCheckin.tsx`: Save-Flow, onConflict, Fehlerbehandlung.
- `src/pages/Dashboard.tsx`: `checkSetup`, `checkAssessments`, `checkTodayCheckin`, Setup-Save/Add-Event/Sync-Writes.
- `src/pages/Assessment.tsx`: Session-ID-Ermittlung + Ladequeries für Pre/Post.
- Neue SQL-Migration für Constraint/Unique/Backfill.
