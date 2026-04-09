

# Systemaudit: Verbleibende Bugs die den Launch blockieren

## Gefundene Probleme (4 Stück)

### BUG 1: Analysis-Update schlägt fehl (KRITISCH)

**Datei:** `src/components/questionnaire/QuestionnaireResults.tsx` Zeile 143-144

```typescript
await updateQuery.eq("user_id", userId).order("created_at", { ascending: false }).limit(1);
```

**Problem:** `.order()` und `.limit()` funktionieren NICHT auf `.update()` Queries im Supabase JS Client. Das bedeutet: Die KI-Analyse wird generiert, aber **NICHT in der Datenbank gespeichert**. Der User sieht die Analyse einmalig, aber beim nächsten Dashboard-Besuch ist sie weg → Redirect zum Fragebogen → endlose Schleife.

**Fix:** Zuerst den neuesten Eintrag per SELECT finden, dann per `.eq("id", row.id)` updaten.

---

### BUG 2: KI-Sync generiert generische Aufgaben (KRITISCH)

**Datei:** `src/pages/Dashboard.tsx` Zeile 635-642

```typescript
// syncTasks — fehlt sport, position, level!
body: {
  calendarEvents: events,
  analysis,
  competitionDate, competitionName,
  // ← KEIN sport, position, level!
}
```

**Problem:** Wenn ein Spieler den "KI-Sync" Button drückt, werden `sport`, `position` und `level` NICHT an die Edge Function übergeben. Die Aufgaben werden generisch generiert — kein Fußball, kein American Football, keine positionsspezifischen Szenarien. Nur beim initialen Kalender-Setup werden diese Parameter mitgeschickt.

**Fix:** Im `syncTasks` die Sport-Daten aus dem `profiles`-Table laden und an `adapt-program` mitgeben — genau wie es `CalendarSetup` und `DailyCheckin.triggerRegeneration` bereits tun.

---

### BUG 3: Doppelte RLS Policies

**Tabellen:** `questionnaire_responses`, `calendar_events`, `daily_checkins`, `personalized_tasks`, `program_settings`

Jede Tabelle hat DOPPELTE Policies für die gleichen Operationen:
- "Users can insert own responses" UND "Users insert own questionnaire_responses" (beide INSERT, gleicher Check)
- "Users can view own responses" UND "Users read own questionnaire_responses" (beide SELECT, gleicher Check)

**Problem:** Doppelte Policies können zu Verwirrung führen und machen Debugging schwieriger. Sie blockieren nicht direkt, aber bei zukünftigen Policy-Änderungen kann das zu Fehlern führen. Kein Showstopper, aber sollte bereinigt werden.

**Fix:** Die duplizierten Policies per Migration entfernen.

---

### BUG 4: `program_settings` upsert ohne unique constraint

**Datei:** `src/pages/Dashboard.tsx` Zeile 626-632

```typescript
await supabase.from("program_settings").upsert({...}, { onConflict: "session_id" });
```

**Problem:** Wenn es keinen UNIQUE constraint auf `session_id` in `program_settings` gibt, schlägt das `upsert` fehl. Betrifft nur den anonymen Pfad (der jetzt durch ProtectedRoute nicht mehr erreicht werden sollte), aber der Code existiert noch.

---

## Änderungen

### 1. `src/components/questionnaire/QuestionnaireResults.tsx`
- Analysis-Update fixen: Zuerst SELECT mit order/limit, dann UPDATE per `id`

### 2. `src/pages/Dashboard.tsx`
- `syncTasks`: Sport, Position, Level aus `profiles` laden und an `adapt-program` übergeben

### 3. DB-Migration: Doppelte RLS Policies bereinigen
- Duplikate pro Tabelle identifizieren und entfernen

### 4. Toter Code aufräumen
- Anonyme upsert-Pfade entfernen (User ist durch ProtectedRoute immer eingeloggt)

---

## Was funktioniert

Folgende Teile des Systems sind korrekt implementiert und ready:

| Schritt | Status |
|---|---|
| Landing Page → Auth Redirect | OK |
| Registrierung mit Sport + Teamcode | OK |
| Sport wird in Profil gespeichert (Trigger + Backup) | OK |
| Questionnaire ist geschützt (ProtectedRoute) | OK |
| Fragebogen speichert mit user_id | OK |
| KI-Analyse wird generiert (analyze-questionnaire) | OK |
| Kalender-Setup schickt Sport an adapt-program | OK |
| adapt-program hat Null-Safety | OK |
| DailyCheckin Auto-Regeneration | OK |
| Coach Dashboard / Team Management | OK |
| RLS schützt Daten pro User | OK |
| Pre/Post Assessment Tests | OK |

