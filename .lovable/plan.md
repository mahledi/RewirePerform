

# End-to-End Pipeline Audit: Verbleibende Schwachstellen

## Aktuelle Situation nach bisherigen Fixes

Was bereits funktioniert:
- `adapt-program` hat Null-Safety (Minimalprofil bei fehlender Analyse)
- Dashboard sucht Analysis per `user_id` ODER `session_id`
- Auth verlinkt anonyme Session-Daten beim Login
- DailyCheckin hat Auto-Regeneration

## Verbleibende systemische Probleme (3 Stück)

### Problem 1: Fragebogen ist NICHT geschützt

`/questionnaire` hat **keinen ProtectedRoute-Wrapper** (App.tsx Zeile 30). Das bedeutet:
- User kann den Fragebogen OHNE Login ausfüllen
- `user_id` wird `null` gespeichert (QuestionnaireResults.tsx Zeile 88)
- Wenn der User sich DANACH registriert, hängt die Verknüpfung am `linkSessionData` in Auth.tsx — was nur funktioniert wenn die `session_id` übereinstimmt
- **Wenn der User den Browser wechselt oder Cookies löscht: Analyse verloren**

**Fix:** Questionnaire hinter `ProtectedRoute` setzen. Der User MUSS eingeloggt sein bevor er den Fragebogen ausfüllt. Dann ist `user_id` immer gesetzt.

### Problem 2: Analysis-Update nutzt nur session_id

QuestionnaireResults.tsx Zeile 136-140:
```typescript
await supabase
  .from("questionnaire_responses")
  .update({ analysis: analysisResult })
  .eq("session_id", sessionId);
```

Wenn der User eingeloggt ist, sollte das Update per `user_id` erfolgen — nicht per `session_id`. Bei mehreren Einträgen mit der gleichen `session_id` (z.B. nach Neustart des Fragebogens) wird sonst der falsche Eintrag aktualisiert.

**Fix:** Wenn `user_id` vorhanden, per `user_id` + neuestem Eintrag updaten. Session_id nur als Fallback.

### Problem 3: Dashboard redirect → ungeschützter Fragebogen

Dashboard.tsx Zeile 445-447: Wenn keine Analysis gefunden wird, redirect zu `/questionnaire`. Aber der Questionnaire ist nicht geschützt — der User könnte dort landen ohne Login-Kontext, den Fragebogen ausfüllen, und wieder das gleiche `user_id: null` Problem haben.

**Fix:** Wird durch Problem 1 automatisch gelöst (ProtectedRoute).

---

## Änderungen

### 1. `src/App.tsx`
- Questionnaire hinter `ProtectedRoute` setzen

### 2. `src/components/questionnaire/QuestionnaireResults.tsx`
- Analysis-Update: Per `user_id` wenn eingeloggt, per `session_id` nur als Fallback
- Insert: Sicherstellen dass `user_id` immer gesetzt wird (User ist durch ProtectedRoute garantiert eingeloggt)

### 3. Kein weiterer Edge Function oder Dashboard-Change nötig
- adapt-program Null-Safety ist bereits implementiert
- Dashboard Analysis-Lookup ist bereits robust
- DailyCheckin Auto-Regeneration funktioniert

