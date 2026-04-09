

# Fix: Sport aus Registrierung in Profil speichern

## Problem
Der DB-Trigger `handle_new_user` schreibt nur `full_name` ins Profil — `sport` aus den User-Metadaten wird ignoriert. Das führt zu `profiles.sport = NULL` bis der Fragebogen abgeschlossen wird.

## Lösung

### 1. DB-Migration: Trigger erweitern
Den `handle_new_user` Trigger aktualisieren, sodass er `sport` aus `raw_user_meta_data` mit übernimmt:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, sport)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'sport'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Auth.tsx: Sport nach Signup direkt in Profil schreiben (Backup)
Nach erfolgreichem Signup in Auth.tsx Zeile 126-133, zusätzlich:
```typescript
// Write sport to profiles directly (in case trigger doesn't catch it)
if (sport && data.user) {
  await supabase.from("profiles").update({ sport }).eq("id", data.user.id);
}
```

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| DB-Migration | `handle_new_user` Trigger: `sport` aus Metadaten übernehmen |
| `src/pages/Auth.tsx` | Nach Signup `sport` direkt in profiles schreiben als Backup |

