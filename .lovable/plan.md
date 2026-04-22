
## Tage 4 + 5: Ja — exakt auf Niveau Tage 1–3. Implementieren.

### Qualitätscheck

Beide Tage haben **alle Felder** im Maximum-Format:
- `lens`, `today_trigger`, `core_shift`, `science_bite` — vollständig, mechanistisch sauber
- 3 Tasks mit kompletter Tiefe (`trigger`, `when_to_use`, `action`, `why`, `explanation`, `self_talk`, `micro_reframe`, `reframe_step`, `system_function`, `icon`)
- Journal mit 4 Fragen + `gratitude_instruction` + `free_reflection_prompt`
- `self_talk_anchors` mit `when`, `variants` (training/rest/match)

**Psychologische Substanz:**
- **Tag 4** — saubere ACT-Sequenz: Unsteuerbares benennen → Energie zurück → Spirale stoppen. Genau das 3-Stufen-Pattern.
- **Tag 5** — präzise Self-referential-Awareness: Bild-Moment erkennen → Quality Redirect → Service over Image. Lehrbuch-Aufbau.

Identisches Niveau zu Tagen 1–3. Keine Drift, keine Repetition.

### Implementierung — was passiert

**1. Schema-Erweiterung in `src/content/matrixDayTypes.ts`**
- `DailyTask` bekommt optionale Felder, die das neue Format trägt: `trigger`, `whenToUse` (existiert bereits als String — ok), `action`, `explanation` (existiert als `detailedExplanation` — gemappt), `microReframe` (existiert), `selfTalk` (existiert), `reframeStep` (existiert), `systemFunction` (existiert)
- Tatsächlich neu nötig: nichts strukturell. Mapping erledigt es.
- `DailyContent` bekommt: `coreShift` (existiert als `todayTrigger`/`coreShift` — bereits da), `variants: { training, rest, match }` neu
- `DailyJournal` umbenennen-Mapping: `journalTitle`, `gratitudeInstruction`, `freeReflectionPrompt` — alle vorhanden

**2. Mapping-Schicht `src/content/dayPlayerMapper.ts` (neu)**
- Funktion `mapPlayerDayToDailyContent(playerDay)` → konvertiert snake_case Player-Format zu camelCase `DailyContent`
- Mappt `tasks[].action + tasks[].trigger + tasks[].when_to_use` zusammen zu `concreteAction` (Action ist Hauptinhalt, trigger/when_to_use im UI separat darstellbar)
- Hängt `variants` als neues Feld an

**3. Tag 1–5 droppen in `src/content/dailyContent.ts`**
- Import der `DAYS_1_3_PLAYER` und `DAYS_4_5_PLAYER` Arrays in eine neue Datei `src/content/playerDays.ts`
- `getDailyContent(dayNumber)` greift zuerst auf den Mapper zu, falls Player-Tag vorhanden

**4. UI-Erweiterung `TaskDetail.tsx`** (minimal)
- Neuer Block für `task.trigger` + `task.whenToUse` als „Wann anwenden"-Karte (existiert teilweise schon im Header — wird sauber getrennt dargestellt)
- Neuer Block für `variants` auf Tag-Ebene (klein, am Ende: Training / Rest / Match Kurzversion)

**5. Verifikation**
- `npm run build` läuft sauber
- Tag 1–5 im Preview öffnen, prüfen ob: `reframe_step`-Stepper rendert, `self_talk_anchors` mit `when` angezeigt werden, `variants` sichtbar sind

### Was NICHT in diesem Schritt passiert

- Kein `comprehensionPool` für Tage 1–5 (kannst du später nachliefern oder ich generiere ableitend)
- Keine Änderung an Matrix-Skelett (`matrixDays.ts`)
- Keine DB-Migration

### Lieferreihenfolge

1. Schema + Mapper + `playerDays.ts` mit Tagen 1–5
2. `getDailyContent` umstellen
3. UI-Anpassung in `TaskDetail.tsx` (variants + when_to_use Karte)
4. Build + Preview-Check

Danach bereit für Tag 6–10 im selben Format.
