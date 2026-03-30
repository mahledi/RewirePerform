

# Fix: Duplikate bereinigen + Upsert-Logik auf user_id umstellen

## Ziel
System produktionsreif machen: keine Duplikate, zuverlässige Upserts, personalisierte Tasks werden gespeichert.

## Schritt 1: Datenbank-Migration

### Duplikate bereinigen
- `calendar_events`: Duplikate entfernen (behalte nur eine Session pro `user_id + date + event_type`)
- `program_settings`: Duplikate entfernen (behalte nur einen Eintrag pro `user_id`)

### Neue Constraints
- `personalized_tasks`: Partial unique index `(user_id, date) WHERE user_id IS NOT NULL` hinzufügen
- `program_settings`: Partial unique index `(user_id) WHERE user_id IS NOT NULL` hinzufügen

## Schritt 2: Dashboard.tsx — Upsert-Logik fixen

### handleSave (Kalender-Setup, Zeile ~121)
`program_settings` Upsert: Wenn `user_id` vorhanden, erst prüfen ob Settings für diesen User existieren → update statt insert mit `onConflict: "session_id"`.

### syncTasks (Zeile ~491)
Gleiche Logik: `onConflict` muss für eingeloggte User `user_id`-basiert sein.

### personalized_tasks Upsert (Zeile ~152 und ~518)
Für eingeloggte User: check-then-update/insert Pattern (wie bei daily_checkins), oder neuen `user_id,date` Constraint als conflict target nutzen.

## Schritt 3: Edge Function Fehler sichtbar machen

`adapt-program` Aufruf: Wenn die Function einen Fehler zurückgibt, wird das aktuell geloggt aber der User sieht nur eine generische Warnung. Error-Details in den Toast einbauen für Debugging.

## Betroffene Dateien
- Neue SQL-Migration (Duplikat-Cleanup + Constraints)
- `src/pages/Dashboard.tsx` (handleSave, syncTasks, personalized_tasks Upsert)

## Ergebnis
Nach diesem Fix:
- Keine Duplikate mehr möglich
- Personalisierte Tasks werden zuverlässig gespeichert
- System ist bereit für Team-Einsatz (Datenintegrität + Sicherheit gewährleistet)

