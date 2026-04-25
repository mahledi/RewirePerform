# Pre-Launch Bug-Sweep – Plan

5 Launch-Blocker werden in einer logischen Reihenfolge behoben. Reihenfolge folgt dem Prinzip: **erst die Daten-Integrität sichern, dann UI bereinigen.**

**Geschätzter Gesamtaufwand:** ~4–6 Stunden Implementierung + Test.

---

## Reihenfolge & Übersicht

| # | Bug | Bereich | Aufwand | Risiko bei Nicht-Fix |
|---|---|---|---|---|
| 1 | Bug 15 – Position über `profiles.team` | Datenmodell + Profile | ~1.5h | Falsche Personalisierung, Verwirrung mit Coach-Teams |
| 2 | Bug 5 – Questionnaire Race Condition | Fragebogen-Save | ~1h | Datenverlust in Multi-Tab-Szenarien |
| 3 | Bug 13 – Check-in doppelt triggerbar | Daily Check-in | ~30min | Doppelte Einträge, Statistik-Verfälschung |
| 4 | Bug 20 – `competitionDate` Format | Dashboard-Settings | ~45min | DB-Fehler bei ungültiger Eingabe, UI-Crash |
| 5 | Bug 21 – KI-Sync Button irrelevant | Dashboard-UI | ~30min | User-Verwirrung („KI passt an…" passiert nichts mehr) |

---

## Bug 1 – Position eigene Spalte (war Bug 15)

**Problem:** `DailyCheckin.tsx` Z. 82 nutzt `profile?.team` als Spielposition. Das Feld `profiles.team` ist ein historisches Free-Text-Feld und kollidiert semantisch mit dem neuen Coach-Team-System (`teams`-Tabelle).

**Lösung:**
- DB-Migration: neue Spalte `profiles.position TEXT NULL`.
- One-Time Backfill: `UPDATE profiles SET position = team WHERE position IS NULL AND team IS NOT NULL`.
- Code-Umstellung:
  - `src/components/dashboard/DailyCheckin.tsx` Z. 73 + 82: `select("sport, position")` und `position: profile?.position ?? null`.
  - `src/pages/Settings.tsx` (oder wo immer Profil bearbeitet wird) – Eingabefeld „Position" hinzufügen, das auf `position` schreibt.
- `profiles.team` bleibt vorerst als Legacy-Feld erhalten (kein Drop), nur nicht mehr verwendet.

**Konkrete Code-Ziele:**
- `supabase/migrations/<ts>_add_profiles_position.sql`
- `src/components/dashboard/DailyCheckin.tsx` (Z. 71–83)
- `src/pages/Settings.tsx` (neuer Profil-Block) – falls noch nicht vorhanden, kleines Profil-Edit-Formular ergänzen
- `src/integrations/supabase/types.ts` (auto)

---

## Bug 2 – Questionnaire Race Condition (war Bug 5)

**Problem:** `QuestionnaireFlow.tsx` Z. 100–113: Beim ersten Auto-Save wird `INSERT` ohne Idempotenz gemacht. Wenn zwei Tabs/Devices parallel speichern, entstehen Duplikat-Drafts (Unique-Index `WHERE is_complete=false` würde greifen → Fehler im 2. Tab → Datenverlust). Außerdem: `Questionnaire.tsx` Z. 30–37 lädt nur den neuesten Draft, alte verwaiste Drafts bleiben liegen.

**Lösung:**
- **Echtes Upsert statt INSERT:** Ersetze den `insert(...).select("id").single()`-Pfad durch ein `upsert(..., { onConflict: "user_id", ignoreDuplicates: false })`-Muster. Dafür braucht es einen Partial-Unique-Index auf `(user_id) WHERE is_complete = false` (Migration 20260425024353 hat ihn bereits).
- Alternative (sauberer): Vor dem ersten INSERT ein **Pre-Check + Lock** – `select id` mit `is_complete=false`, wenn vorhanden → `draftIdRef = existing.id` setzen und `update` machen.
- **Mount-Time Cleanup:** In `Questionnaire.tsx` (loadDraft) → wenn mehrere unvollständige Drafts existieren, alle bis auf den jüngsten löschen.
- **Save-Mutex:** `isSavingRef` einführen, damit parallele `saveDraft`-Aufrufe sequenziell laufen (verhindert Race innerhalb desselben Tabs).

**Konkrete Code-Ziele:**
- `src/components/questionnaire/QuestionnaireFlow.tsx` (Z. 75–124, `saveDraft`)
- `src/pages/Questionnaire.tsx` (Z. 22–57, `loadDraft`)

---

## Bug 3 – Check-in doppelt triggerbar (war Bug 13)

**Problem:** `DailyCheckin.tsx` Z. 517–532: Der „Abschließen"-Button triggert `saveCheckin()`. Zwischen Klick und `setSaving(true)` (Z. 100) gibt es ein Zeitfenster für Doppel-Klicks. Außerdem keine UI-Disable-Bindung an `saving` für den Button selbst.

**Lösung:**
- `disabled={saving || ...}` direkt am Button-Element ergänzen (Z. 524).
- `saveCheckin()` mit Guard am Anfang: `if (saving) return;`.
- Optional: `useRef<boolean>` als zusätzlicher synchroner Lock, da `setSaving` async ist.

**Konkrete Code-Ziele:**
- `src/components/dashboard/DailyCheckin.tsx` Z. 98–100 (Guard) und Z. 517–532 (disabled-Logik)

---

## Bug 4 – `competitionDate` Format-Validierung (war Bug 20)

**Problem:** `Dashboard.tsx` schreibt den rohen String aus `<input type="date">` an mehreren Stellen (Z. 118, 127, 498, 506) ohne Validierung in die DB. `<input type="date">` liefert in den meisten Browsern `YYYY-MM-DD`, aber bei Safari iOS / leerer Eingabe / Locale-Edge-Cases gibt's Inkonsistenzen. Anzeige Z. 919 hat zwar `!isNaN()`, das schützt aber nicht den Schreibpfad.

**Lösung:**
- Helper `normalizeDateString(value: string): string | null` zentral in `src/lib/utils.ts` – akzeptiert `YYYY-MM-DD`, gibt `null` bei ungültig zurück.
- Alle vier Schreibstellen (`competition_date: competitionDate || null`) auf `normalizeDateString(competitionDate)` umstellen.
- Zusätzlich: bei Save eine Toast-Warnung, wenn der User etwas eingegeben hat, aber das Format ungültig ist (Edge Case Safari).

**Konkrete Code-Ziele:**
- `src/lib/utils.ts` (Helper hinzufügen)
- `src/pages/Dashboard.tsx` Z. 117–131, Z. 489–510

---

## Bug 5 – KI-Sync Button entfernen (war Bug 21)

**Problem:** `Dashboard.tsx` Z. 710–745 zeigt ein Settings-Panel mit „Programm anpassen / KI passt an…"-Button. Die App nutzt aber seit der Matrix-Umstellung deterministische Inhalte (siehe Kommentar in `Dashboard.tsx` Z. 133–134). Der Button schreibt nur noch `competition_date` in die DB – das Wording ist irreführend.

**Lösung:**
- Button-Label umbenennen: „KI passt an…" → „Speichern".
- Beschreibungstext Z. 733 ändern: „Änderungen werden beim nächsten KI-Sync wirksam." → „Wettkampfziel wird gespeichert. Es dient als zeitlicher Anker im Programm."
- Icon `RefreshCw` durch `Save` (oder `Check`) ersetzen.
- Funktion `syncTasks()` umbenennen in `saveCompetitionGoal()` (semantisch korrekt) – Logik bleibt.

**Konkrete Code-Ziele:**
- `src/pages/Dashboard.tsx` Z. 483–518 (Funktion) und Z. 710–745 (UI)

---

## Test-Plan nach Implementierung

1. **Bug 15:** Profil mit Position bearbeiten → DailyCheckin laden → in `user_day_assignments.adaptation_summary` muss korrekte Position stehen.
2. **Bug 5:** Fragebogen in 2 Tabs öffnen, in beiden eine Antwort geben → kein Fehler, ein einziger Draft in DB.
3. **Bug 13:** Im Reflexions-Step 5x schnell „Abschließen" klicken → genau 1 `daily_checkins`-Eintrag.
4. **Bug 20:** Im Settings-Panel ein invalides Datum forcieren (Safari iOS oder DevTools-Override) → kein DB-Fehler, klare Toast-Meldung.
5. **Bug 21:** Settings-Panel öffnen → kein „KI"-Wording mehr sichtbar.

---

## Was bleibt für Post-Launch

- Bug 10/11/14/30 (orange) → Sprint 1 nach Launch
- Bug 24/26/29 (gelb) → Tech-Debt-Sprint

Nach Approval starte ich mit **Bug 15** (DB-Migration zuerst, weil Foundation für sauberes Datenmodell), dann linear durch.
