# RewirePerform — Migration Lovable Cloud → eigenes Supabase-Projekt

> **Status:** Historischer, supersedierter Migrationsplan. Nicht ausfuehren. Production ist heute `bqsbxesmybthwtxmowfz`; `towgvykgezrmkbyudjen` und `twceqincrbrenyuqukpj` sind stillgelegte Ziele.

## Projekte

| Rolle | Project Ref | URL |
|---|---|---|
| **Aktuell Live (Lovable Cloud)** | `twceqincrbrenyuqukpj` | `https://twceqincrbrenyuqukpj.supabase.co` |
| **Neues Production-Ziel (eigene Org)** | `bqsbxesmybthwtxmowfz` | `https://bqsbxesmybthwtxmowfz.supabase.co` |
| **Staging / Dry-Run (eigene Org)** | `towgvykgezrmkbyudjen` | `https://towgvykgezrmkbyudjen.supabase.co` |

Publishable (anon) Key Prod-Ziel: `sb_publishable_pz7RYRDeeN4wazMci1Y2vg_WBCkKTFd`

> Service-Role-Key und DB-Passwort liegen ausschließlich lokal bei dir bzw. im Hosting-Provider. Niemals im Repo committen.

---

## Phase A — Neues Projekt aufsetzen (lokal, kein Risiko für Live)

Alle Befehle laufen lokal auf deinem Mac gegen `bqsbxesmybthwtxmowfz`. Lovable Cloud wird nicht berührt.

### A0. Vorbereitungen einmalig
```bash
brew install supabase/tap/supabase   # oder npm i -g supabase
supabase login
git clone <repo-url> rewireperform && cd rewireperform
npm ci
```

### A1. Repo mit neuem Projekt linken
```bash
supabase link --project-ref bqsbxesmybthwtxmowfz
# DB-Passwort des NEUEN Projekts eingeben (Dashboard → Project Settings → Database)
```
> `supabase/config.toml` enthält `project_id = "twceqincrbrenyuqukpj"`. **Nicht editieren** — `--project-ref` überschreibt das pro Befehl. Lovable würde Änderungen an `config.toml` zurücksetzen.

### A2. Schema pushen
```bash
supabase db push --project-ref bqsbxesmybthwtxmowfz
```
Erwartet: alle Migrations aus `supabase/migrations/` laufen sauber durch. Tabellen, RLS, Trigger, Funktionen, Enums sind danach im neuen Projekt vorhanden.

### A3. Edge Functions deployen
```bash
for fn in team-mental-state qa-create-cohort qa-set-time \
          send-daily-reminder get-vapid-public-key \
          analyze-questionnaire generate-transformation-summary; do
  supabase functions deploy $fn --project-ref bqsbxesmybthwtxmowfz
done
```

### A4. Edge-Function Secrets im neuen Projekt setzen
Dashboard: `bqsbxesmybthwtxmowfz` → Edge Functions → Secrets. Oder CLI:
```bash
supabase secrets set --project-ref bqsbxesmybthwtxmowfz \
  SUPABASE_URL=https://bqsbxesmybthwtxmowfz.supabase.co \
  SUPABASE_ANON_KEY=sb_publishable_pz7RYRDeeN4wazMci1Y2vg_WBCkKTFd \
  SUPABASE_SERVICE_ROLE_KEY=<NEUER_SERVICE_ROLE_KEY> \
  VAPID_PUBLIC_KEY=<gleicher_wert_wie_im_alten_Projekt> \
  VAPID_PRIVATE_KEY=<gleicher_wert_wie_im_alten_Projekt> \
  VAPID_SUBJECT=mailto:hello@rewireperform.com
```
VAPID-Keys **identisch** zum alten Projekt setzen, damit bestehende Push-Subscriptions nach Cutover gültig bleiben. Die VAPID-Werte stehen im alten Projekt unter Edge Functions → Secrets (nur einmal sichtbar — falls verloren, neue Keys generieren und akzeptieren, dass User Push neu erlauben müssen).

### A5. Auth konfigurieren (Dashboard im neuen Projekt)
- **Site URL:** `https://rewireperform.com`
- **Redirect URLs:**
  - `https://rewireperform.com/**`
  - `https://www.rewireperform.com/**`
  - `https://staging.rewireperform.com/**`
  - Spätere Vercel-Preview-Pattern: `https://*-rewireperform.vercel.app/**`
- **Providers:** Email an, Google an (gleicher Google-Client wie aktuell; in der Google Cloud Console zusätzliche autorisierte Redirect-URI `https://bqsbxesmybthwtxmowfz.supabase.co/auth/v1/callback` hinzufügen — die alte URI nicht löschen)
- **Auto-Confirm Email:** identisch zur alten Einstellung
- **Anonymous Sign-ins:** aus
- **Password HIBP Check:** identisch zur alten Einstellung
- **Email Templates:** falls custom angepasst, 1:1 aus altem Projekt übernehmen

### A6. Storage-Buckets nachbauen
Bucket-Liste aus altem Projekt (Dashboard → Storage) abgleichen. Pro Bucket im neuen Projekt: gleicher Name, gleiches `public`-Flag, RLS-Policies. Objekte werden in Phase B mit migriert.

### A7. Realtime
Falls Tabellen über `supabase_realtime` Publication exponiert sind (z. B. `team_calendar_events`), im neuen Projekt dieselben Tabellen zur Publication hinzufügen.

### A8. Cron-Job für `send-daily-reminder` — vorbereiten, **nicht aktivieren**
SQL in einer Datei lokal ablegen, bis Cutover:
```sql
-- NICHT ausführen vor Cutover
select cron.schedule(
  'send-daily-reminder-30min',
  '*/30 * * * *',
  $$
  select net.http_post(
    url:='https://bqsbxesmybthwtxmowfz.supabase.co/functions/v1/send-daily-reminder',
    headers:='{"Content-Type":"application/json","apikey":"sb_publishable_pz7RYRDeeN4wazMci1Y2vg_WBCkKTFd"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
```
Würde es jetzt aktiviert, würden User doppelte Push-Notifications bekommen (altes + neues Projekt).

### A9. Lokaler Smoke-Test gegen leeres neues Projekt
`.env.local` lokal anlegen (nicht committen):
```
VITE_SUPABASE_URL=https://bqsbxesmybthwtxmowfz.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_pz7RYRDeeN4wazMci1Y2vg_WBCkKTFd
VITE_SUPABASE_PROJECT_ID=bqsbxesmybthwtxmowfz
VITE_APP_ENV=staging
```
```bash
npm run dev
```
Test-Account anlegen, Onboarding, Check-in, Journal, Coach-Flow durchspielen. Muss komplett funktionieren, bevor wir echte Daten migrieren. Wenn etwas hakt → Edge-Function-Secret fehlt, Auth-Redirect falsch, oder eine Migration ist nicht im Repo.

**Phase-A-Done-Definition:** leeres neues Projekt antwortet auf alle App-Flows korrekt.

---

## Phase B — Dry-Run-Datenmigration nach `towgvykgezrmkbyudjen`

Datenumzug **einmal komplett** üben, gegen Staging, nicht gegen das neue Prod-Ziel. Hält das Prod-Ziel sauber für den späteren echten Cutover.

### B1. Quellexport aus Lovable Cloud
Pro Tabelle CSV. Reihenfolge wegen Foreign Keys:
```
auth.users
→ profiles, user_roles
→ teams, team_members
→ program_instances, program_settings
→ training_schedule, team_training_schedule, team_calendar_events, calendar_events
→ assessments, daily_checkins, daily_journals
→ user_day_completion, user_day_assignments
→ comprehension_check_instances, program_progress_snapshots
→ personalized_tasks, coach_journals
→ deep_profile_assessments, questionnaire_responses
→ study_cohorts, study_participants, study_measurement_windows,
   study_aggregate_snapshots, study_export_manifests
→ notification_log, push_subscriptions, feedback, app_event_log, qa_time_overrides
```
`auth.users` muss inkl. `id`, `email`, `encrypted_password`, `email_confirmed_at`, `raw_user_meta_data`, `created_at`, `last_sign_in_at` exportiert werden. Lovable Cloud zeigt keinen `service_role`-Key — der Export läuft entweder
- über die in Lovable verfügbare CSV-Export-Funktion pro Tabelle, oder
- via einer einmalig deployten Migrations-Edge-Function im alten Projekt, die mit dem dort intern verfügbaren Service-Role-Key liest und das JSON zurückgibt.

### B2. Import in Staging-Projekt
1. Trigger temporär abschalten, sonst doppelte Profile/Roles:
   ```sql
   alter table auth.users disable trigger user_role_on_signup;
   alter table auth.users disable trigger on_auth_user_created;
   ```
2. `auth.users` mit **beibehaltenen IDs** importieren. Jede FK in `public.*` hängt an `auth.users.id` — IDs niemals neu vergeben.
3. Restliche Tabellen per `\copy` aus CSV in oben genannter Reihenfolge.
4. Trigger wieder aktivieren.

### B3. Validierung
- Row Counts pro Tabelle = Quelle.
- Konkreten User aus alter DB im Staging einloggen → Dashboard identisch.
- Coach-Account → Team-Übersicht identisch.
- Push-Subscription rebind (Endpoint bleibt, VAPID muss identisch sein).

**Phase-B-Done-Definition:** Staging fühlt sich an wie Live.

---

## Phase C — Externes Hosting (Staging)

### C1. Vercel-Projekt anlegen
GitHub-Repo verbinden, Framework = Vite. Build:
```
Install: npm ci
Build:   npm run build
Output:  dist
Node:    22
```

### C2. Env-Vars in Vercel für `staging`-Branch
```
VITE_SUPABASE_URL=https://towgvykgezrmkbyudjen.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<STAGING_ANON_KEY>
VITE_SUPABASE_PROJECT_ID=towgvykgezrmkbyudjen
VITE_APP_ENV=staging
VITE_SENTRY_DSN=(optional)
```

### C3. Staging-Subdomain
`staging.rewireperform.com` CNAME auf Vercel. Domain in Staging-Supabase als Redirect URL und Site URL eintragen.

**Production-Domain `rewireperform.com` bleibt unangetastet auf Lovable.**

### C4. End-to-End-Test auf `staging.rewireperform.com`
Login, Check-in, Journal, Coach, Admin, Push, OAuth.

---

## Phase D — Cutover (separater Plan, später)

Nicht jetzt. Kurzfassung:
1. Wartungsfenster ankündigen ("einmal neu einloggen nötig").
2. Schreibsperre auf Lovable.
3. Delta-Export Lovable → Import in `bqsbxesmybthwtxmowfz`.
4. Vercel-Production-Env auf neues Projekt zeigen lassen.
5. DNS `rewireperform.com` → Vercel.
6. Cron im neuen Projekt **an**, im alten **aus**.
7. 72h Rollback-Fenster offenhalten.

Eigener Plan kommt, wenn A–C grün sind.

---

## Was du in Phase A/B/C **nicht** tun darfst

- `rewireperform.com` mit Vercel verbinden.
- `src/integrations/supabase/client.ts` oder `supabase/config.toml` editieren — Lovable-managed.
- Auth/Functions/Cron im **alten** Projekt ändern.
- Service-Role-Key oder DB-Passwort committen.
- Cron im neuen Projekt aktivieren.
- Lovable Cloud disablen.
- User-IDs beim Import neu vergeben.

---

## Checkliste "bereit für Cutover"

- [ ] A1–A9 grün, leeres neues Projekt voll bedienbar
- [ ] B1–B3 grün, Staging fühlt sich wie Live an
- [ ] Vercel-Staging stabil seit ≥3 Tagen
- [ ] Delta-Export-Skript reproduzierbar
- [ ] User-Kommunikation für Re-Login vorbereitet
- [ ] Rollback dokumentiert (DNS zurück auf Lovable, Cron-Switch zurück, Delta zurück)

---

## Nächster Schritt für dich

1. Service-Role-Key und DB-Passwort von `bqsbxesmybthwtxmowfz` aus dem Supabase-Dashboard holen (Project Settings → API bzw. Database).
2. Lokal `supabase login` + `supabase link --project-ref bqsbxesmybthwtxmowfz`.
3. A2 (`supabase db push`) ausführen und Output schicken.

Ich kann von hier aus weder das externe Projekt linken noch Migrations dahin pushen — das muss aus deiner Shell mit deinem Login passieren. Sobald A2 durch ist, gehen wir A3–A9 zusammen Schritt für Schritt durch.
