
## Vorab-Hinweis

Im Projekt existieren weder die `push_subscriptions`-Tabelle noch die `send-daily-reminder` Edge Function noch ein Service Worker oder VAPID-Setup. Der Plan baut die komplette Web-Push-Infrastruktur neu auf – nicht nur die im Brief genannten Erweiterungen.

Da der stündliche Cron beibehalten wird, wird der Pre-Training-Reminder auf die volle Stunde **1 Stunde vorher** ausgelöst (z. B. Training 17:00 → Reminder um 16:00). Der Brief-Wortlaut "45 Min vorher" wird in den Texten entsprechend zu "in 1 Stunde" angepasst.

---

## Teil 1 — DB-Schema (eine Migration)

Neue Tabellen und Spalten:

**`training_schedule`**
- `id uuid pk`, `user_id uuid not null`, `day_of_week int (0–6, 0=So)`, `training_hour int (0–23)`, `created_at`, `updated_at`
- Unique `(user_id, day_of_week)` für Upsert
- RLS: nur eigene Zeilen lesen/schreiben/löschen

**`push_subscriptions`** (neu)
- `id uuid pk`, `user_id uuid not null`, `endpoint text unique`, `p256dh text`, `auth text`, `user_agent text`
- `morning_hour int default 7`, `morning_minute int default 30`
- `evening_hour int default 21`, `evening_minute int default 0`
- `created_at`, `updated_at`
- RLS: nur eigene Subscriptions

**`notification_log`**
- `id uuid pk`, `user_id uuid`, `notification_type text check in ('morning','pre_training','evening')`, `sent_date date`, `created_at`
- Unique `(user_id, notification_type, sent_date)` für Idempotenz
- RLS: nur eigene Zeilen lesen; Inserts erfolgen aus Edge Function via Service-Role

Trigger `updated_at` auf `training_schedule` und `push_subscriptions`.

---

## Teil 2 — Web-Push-Infrastruktur

**Secrets** (per `add_secret` anfordern, sobald Plan approved):
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (z. B. `mailto:hello@rewireperform.com`)

Ich generiere VAPID-Keys lokal und gebe sie dem User zum Eintragen.

**Service Worker** `public/sw.js`
- `push`-Event: zeigt Notification mit `title`, `body`, `data.url`
- `notificationclick`: öffnet `data.url` in der App
- Registrierung via neuem Hook `src/hooks/usePushSubscription.ts`

**Client-Hook** `src/hooks/usePushSubscription.ts`
- `subscribe()`: fragt Permission, registriert SW, ruft `pushManager.subscribe` mit VAPID-Public-Key, speichert in `push_subscriptions`
- `unsubscribe()`: entfernt SW-Subscription + DB-Zeile
- `updateTimes(morning, evening)`: Update der Stunden in DB
- VAPID-Public-Key wird via Edge Function `get-vapid-public-key` geholt (öffentlich, kein JWT nötig)

---

## Teil 3 — Edge Functions

**`get-vapid-public-key`** (neu, `verify_jwt = false`)
- Gibt `VAPID_PUBLIC_KEY` zurück. Trivial.

**`send-daily-reminder`** (neu)
- Aufgerufen von `pg_cron` stündlich
- Service-Role Client
- Aktuelle UTC-Stunde berechnen
- Für jede aktive `push_subscription` mit zugehörigem aktivem `program_instance` (status='active'):
  1. **Morning**: wenn `morning_hour` == jetzt → senden falls `notification_log` für (user, 'morning', today) leer
  2. **Pre-Training**: heutigen `day_of_week` lookup in `training_schedule`; wenn `training_hour - 1 == jetzt` → senden falls noch nicht gesendet
  3. **Evening**: wenn `evening_hour` == jetzt → senden falls noch nicht gesendet
- Versand via [`@negrel/webpush`](https://jsr.io/@negrel/webpush) (Deno-natives Web-Push, kein Node-`web-push`-Polyfill nötig)
- Bei `410 Gone` / `404`: Subscription aus DB löschen
- Nach erfolgreichem Send: Insert in `notification_log` (Unique-Constraint schützt zusätzlich)

**Cron** (per Insert-SQL, nicht Migration, da projektspezifische URL/Key):
```sql
select cron.schedule('send-daily-reminder-hourly','0 * * * *',
  $$ select net.http_post(url:='…/send-daily-reminder', headers:='…') $$);
```
`pg_cron` und `pg_net` werden in der Migration aktiviert.

**Notiz zur Zeitlogik:** alle gespeicherten Stunden sind UTC. Settings-UI erklärt das nicht, sondern mappt Local→UTC beim Speichern und UTC→Local beim Anzeigen via `Intl`/`Date`.

---

## Teil 4 — Settings-UI (`src/pages/Settings.tsx`)

Zwei neue Sections:

**Trainingszeiten**
- 7 Zeilen Mo–So
- Pro Zeile: Toggle "kein Training" / Dropdown 06:00–22:00 (1h-Steps)
- "Speichern" → upsert in `training_schedule`, leere Tage werden gelöscht

**Benachrichtigungen** (neu oder erweitert, falls Section schon existiert)
- Button "Push aktivieren" → `subscribe()` Hook
- Status-Anzeige (aktiv/inaktiv pro Gerät)
- Morning-Time-Picker: 06:00–10:00 in 30-Min-Steps (default 07:30)
- Evening-Time-Picker: 18:00–23:00 in 30-Min-Steps (default 21:00)
- "Speichern" → Update `push_subscriptions` (alle Subscriptions des Users)
- Hinweis-Text: Pre-Training-Reminder kommt ~1h vorher zur vollen Stunde

---

## Teil 5 — Pre-Training-Screen

**`src/pages/PreTraining.tsx`** (read-only)
- Auth-geschützt via `ProtectedRoute`
- Lädt aktive `program_instance` → `getEffectiveProgramStart` → `getCurrentProgramDay` → `resolveDay(dayNumber, today, 'training', {sport, position})`
- Header: "Gleich geht's los 💪"
- Subtext: "Das nimmst du heute aufs Feld:"
- Liste: 3 Tasks, je `title` + erste Zeile von `description` (oder `oneLiner` falls vorhanden)
- Button "Bereit" → `navigate('/')`
- Empty-State: "Programm noch nicht gestartet"
- Keine Inputs, keine Mutations

**`src/App.tsx`**
- Neue Route `/pre-training` mit `<ProtectedRoute><PreTraining/></ProtectedRoute>`

---

## Teil 6 — Was nicht angefasst wird

- `DailyCheckin.tsx`, `Journal.tsx`, alle Coach-Komponenten, 56-Tage-Programm-Content, Evidence Engine bleiben unverändert.

---

## Akzeptanz-Tests (nach Implementierung)

1. Settings: Trainingszeit Mi 17:00 setzen → DB-Row vorhanden
2. Push aktivieren in Chrome → `push_subscriptions`-Row mit Endpoint
3. Edge Function manuell triggern um simulierte Stunde 16 UTC → Pre-Training-Notification kommt, `notification_log`-Row entsteht
4. Erneuter Trigger derselben Stunde → keine zweite Notification (Idempotenz)
5. Notification klicken → öffnet `/pre-training`, zeigt 3 Tasks
6. Subscription löschen via 410 → automatisch aus DB entfernt

---

## Reihenfolge der Umsetzung (Build-Mode)

1. VAPID-Keys generieren + Secrets anfordern (blockiert Step 4)
2. Migration: 3 Tabellen + RLS + `pg_cron`/`pg_net`
3. `get-vapid-public-key` Edge Function
4. Service Worker + `usePushSubscription` Hook
5. Settings-UI (Trainingszeiten + Notification-Times + Subscribe-Button)
6. `send-daily-reminder` Edge Function + Cron-Insert
7. `PreTraining.tsx` + Route
