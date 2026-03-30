

# Persistenz-Fix: Kalender, Check-ins & Tests zuverlässig speichern

## Problem-Zusammenfassung

Das System hat **3 Kernfehler**, die dazu führen, dass gespeicherte Daten "verschwinden":

1. **RLS blockiert eigene Daten**: Wenn du eingeloggt bist und deine Daten mit `user_id` gespeichert wurden, blockieren die alten `USING (true)` Policies gleichzeitig mit den neuen `auth.uid() = user_id` Policies — das führt zu inkonsistentem Verhalten. Außerdem: Daten die VOR dem Login (nur mit `session_id`) gespeichert wurden, sind nach dem Login unsichtbar, weil RLS `auth.uid() = user_id` prüft, aber `user_id` noch `NULL` ist.

2. **DailyCheckin lädt Tasks nur per `session_id`** (Zeile 89): Personalisierte Aufgaben werden nicht gefunden, wenn sie mit `user_id` gespeichert wurden.

3. **Upsert-Konflikt**: Check-in upsert nutzt `onConflict: "session_id,date"`, aber für eingeloggte User sollte es `user_id,date` sein — sonst werden Duplikate erzeugt oder Updates schlagen fehl.

## Plan

### Schritt 1: Datenbank-Migration

Neue Migration die:

- **RLS-Policies bereinigt**: Alte `USING(true)` Policies auf allen Tabellen droppen. Neue Policies erstellen, die sowohl `auth.uid() = user_id` als auch `session_id`-basierte Zugriffe für eingeloggte User erlauben:
  ```sql
  -- Beispiel für calendar_events:
  DROP POLICY "Allow public read calendar_events" ...;
  DROP POLICY "Allow public insert calendar_events" ...;
  -- etc. für alle alten Policies
  
  CREATE POLICY "Authenticated users own data" 
    ON calendar_events FOR ALL TO authenticated
    USING (user_id = auth.uid() OR session_id = current_setting('request.headers')::json->>'x-session-id');
  ```
  
  Alternativ (einfacher und sicherer): Policies die `user_id = auth.uid()` ODER `user_id IS NULL` erlauben, kombiniert mit einem Code-Fix der bei jedem Write den `user_id` setzt.

- **Unique Constraint für Check-ins**: `UNIQUE(user_id, date)` hinzufügen (partial, nur wenn `user_id NOT NULL`), damit eingeloggte User pro Tag nur einen Check-in haben.

### Schritt 2: DailyCheckin.tsx — Task-Loading fixen

```typescript
// Zeile 84-91: user_id-Fallback hinzufügen
const loadPersonalizedTasks = async () => {
  const dateStr = format(date, "yyyy-MM-dd");
  let q = supabase.from("personalized_tasks").select("tasks").eq("date", dateStr);
  if (user?.id) {
    q = q.or(`user_id.eq.${user.id},session_id.eq.${sessionId}`);
  } else {
    q = q.eq("session_id", sessionId);
  }
  const { data } = await q.maybeSingle();
  // ...
};
```

### Schritt 3: DailyCheckin.tsx — Upsert-Logik fixen

Für eingeloggte User: Erst prüfen ob ein Check-in für `(user_id, date)` existiert, dann Update oder Insert. Alternativ: den neuen Unique Constraint `(user_id, date)` als `onConflict` nutzen.

### Schritt 4: Dashboard.tsx — RLS-kompatible Queries

Die `.or()` Queries funktionieren bereits korrekt im Code — das Problem ist, dass RLS die Zeilen filtert bevor die Query sie sieht. Die Migration in Schritt 1 fixt das.

### Schritt 5: Fehler-Transparenz

- `saveCheckin`: Bereits implementiert (Fehler-Toast + kein Step 4 bei Fehler) ✓
- `handleSave` (Kalender-Setup): Bereits implementiert ✓
- `addEvent`: Error-Toast hinzufügen wenn Insert fehlschlägt

## Technische Details

**Betroffene Dateien:**
- Neue SQL-Migration (RLS-Cleanup + Unique Constraint)
- `src/components/dashboard/DailyCheckin.tsx` (Task-Loading + Upsert)
- `src/pages/Dashboard.tsx` (minor: addEvent Error-Handling)

**Nicht betroffen** (bereits korrekt):
- `Assessment.tsx` — sessionId wird persistiert, user_id wird mitgeschrieben, Queries nutzen `.or()`
- `CalendarSetup` — schreibt bereits `user_id`

