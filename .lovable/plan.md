

# Bulletproof Personalization Pipeline

## Das Problem

Die aktuelle Architektur hat mehrere systemische Schwachstellen, die dazu führen, dass Spieler keine personalisierten Aufgaben bekommen. Das betrifft potenziell JEDEN Nutzer — nicht nur einzelne Accounts.

### Identifizierte Fehlerquellen (7 Stück)

```text
Questionnaire ──→ Auth ──→ Dashboard ──→ adapt-program ──→ Daily Tasks
     ↓                ↓          ↓              ↓               ↓
  session_id     linkSession   loadAnalysis   null-crash     fallback
  mismatch       kann fehlschlagen  "broader search"  wenn analysis  statt KI-Tasks
                                    klaut fremde      fehlt
                                    Daten (!)
```

**Kritisch (Sicherheitslücke):** Dashboard Zeile 444-460 sucht nach IRGENDEINER verwaisten Questionnaire-Response mit `user_id=null`. Bei 300 Spielern bedeutet das: **Spieler B könnte die Analyse von Spieler A übernehmen.**

**Kritisch (Crash):** `adapt-program` Edge Function liest `analysis.mental_score`, `analysis.strengths` etc. direkt — wenn `analysis` null ist, crashed die Funktion.

**Kritisch (Datenverlust):** Wenn ein Spieler den Fragebogen auf dem Handy macht und sich dann auf einem anderen Gerät einloggt, wird die session_id nie matchen. Die Analyse ist verloren.

---

## Lösung: 5 Änderungen

### 1. Questionnaire: User-ID sofort verknüpfen

**Datei:** `src/components/questionnaire/QuestionnaireResults.tsx`

- Wenn der User eingeloggt ist (was durch ProtectedRoute garantiert sein sollte), wird `user_id` IMMER gesetzt
- Session-ID bleibt als Backup, aber `user_id` hat Priorität
- Sport/Position/Level aus Antworten in die `profiles`-Tabelle schreiben

### 2. Auth: Session-Linking absichern

**Datei:** `src/pages/Auth.tsx`

- `linkSessionData` nur Rows claimen, die zur eigenen `session_id` gehören (ist bereits so — gut)
- Nach dem Login/Signup: Prüfen ob `profiles.sport` gesetzt ist. Wenn nicht, aus `questionnaire_responses.answers` nachholen

### 3. Dashboard: Orphaned-Data-Suche entfernen

**Datei:** `src/pages/Dashboard.tsx`

- **Die "broader search" (Zeile 444-460) komplett entfernen** — sie ist eine Sicherheitslücke
- Analysis nur über `user_id` ODER eigene `session_id` laden — niemals fremde Daten claimen
- Wenn keine Analysis gefunden wird: **User klar zum Fragebogen zurückschicken**, nicht still Fallbacks nutzen
- Wenn Analysis da ist aber `personalized_tasks` leer: **automatisch `adapt-program` triggern**

### 4. adapt-program: Null-Safety

**Datei:** `supabase/functions/adapt-program/index.ts`

- Wenn `analysis` null/undefined ist: Minimalprofil generieren (Mental Score 50, keine Stärken/Schwächen)
- Niemals crashen — immer Tasks zurückgeben, auch wenn nur generische

### 5. DailyCheckin: Klarheit statt stille Fallbacks

**Datei:** `src/components/dashboard/DailyCheckin.tsx`

- Wenn nach dem Laden keine personalisierten Tasks gefunden wurden UND der User eingeloggt ist: Anzeigen "Deine Aufgaben werden generiert..." + automatisch `adapt-program` erneut triggern
- Fallback-Tasks nur als absolute Notlösung, mit sichtbarem Hinweis

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `src/components/questionnaire/QuestionnaireResults.tsx` | user_id immer setzen wenn eingeloggt; Sport in profiles schreiben |
| `src/pages/Auth.tsx` | Sport aus Antworten in profiles nachpflegen nach Login |
| `src/pages/Dashboard.tsx` | Broader-search entfernen; fehlende Analysis → Redirect zum Fragebogen; fehlende Tasks → auto-regenerate |
| `supabase/functions/adapt-program/index.ts` | Null-safe analysis handling, Minimalprofil als Fallback |
| `src/components/dashboard/DailyCheckin.tsx` | Auto-regenerate wenn Tasks fehlen; sichtbarer Hinweis bei Fallbacks |

