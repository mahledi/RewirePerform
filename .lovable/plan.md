

# Problem: Personalisierte Aufgaben werden nie gespeichert — Fallback-Tasks statt KI-Tasks

## Diagnose

Die `personalized_tasks`-Tabelle ist **komplett leer**. Das bedeutet: `adapt-program` wurde entweder nie erfolgreich aufgerufen, oder die Ergebnisse konnten nicht gespeichert werden. Die Edge Function Logs zeigen **keine einzigen Aufruf** — die Funktion wurde also nie getriggert.

**Ursachen-Kette:**

1. `adapt-program` wird nur in `CalendarSetup.handleSave()` aufgerufen (Dashboard.tsx, Zeile 183)
2. Der Aufruf hängt davon ab, dass `analysis` vorhanden ist (Zeile 160: `if (analysis && eventData)`)
3. `analysis` kommt aus der `questionnaire_responses`-Tabelle — aber der einzige Eintrag dort hat `user_id: NULL` und `session_id: 52be3d7a...`
4. Dein Account (`870240aa-...`) hat eine **andere session_id** (`c7eca1f1-...` oder `8e1aeec9-...`)
5. **Ergebnis:** Die Questionnaire-Daten werden nie gefunden → `analysis` ist `null` → `adapt-program` wird nie aufgerufen → keine personalisierten Tasks → Fallback-Tasks werden angezeigt

**Zusätzlich:** Dein Profil hat `sport: NULL` — die Sportart wurde nicht gespeichert.

## Lösung

### 1. `src/pages/Dashboard.tsx` — Analysis-Laden robuster machen

- Beim Laden der Analysis nicht nur nach `user_id` suchen, sondern auch nach `session_id` als Fallback
- Wenn ein authentifizierter User eine Analysis mit `user_id: NULL` hat, diese seinem Account zuordnen (Migration)
- Fehlermeldung anzeigen wenn keine Analysis gefunden wird, statt still Fallbacks zu nutzen

### 2. `src/pages/Dashboard.tsx` — CalendarSetup: adapt-program auch ohne Analysis aufrufen

- Wenn keine Analysis vorhanden ist, trotzdem `adapt-program` mit Basis-Daten aufrufen (Sport, Kalender)
- Alternativ: User zum Fragebogen zurückschicken wenn Analysis fehlt

### 3. `src/pages/Dashboard.tsx` — Fehler-Feedback verbessern

- Toast-Nachricht wenn `analysis` nicht gefunden wurde
- Toast wenn `adapt-program` nicht aufgerufen werden konnte
- Im Knowledge-Step klar anzeigen: "Personalisierte Aufgaben werden geladen..." statt still Fallbacks zu zeigen

### 4. Session-ID Konsistenz sicherstellen

- Nach dem Login die `questionnaire_responses` mit der alten `session_id` dem neuen `user_id` zuordnen
- Gleiches für `calendar_events` (dort funktioniert es bereits — dein User hat Kalender-Einträge)

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `src/pages/Dashboard.tsx` | Analysis-Laden: Fallback auf session_id; adapt-program Aufruf robuster; Fehler-Feedback |
| `src/components/dashboard/DailyCheckin.tsx` | Loading-State statt stille Fallbacks; Fehlermeldung wenn keine KI-Tasks |

