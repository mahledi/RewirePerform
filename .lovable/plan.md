## IT-Audit Ergebnis

Rebranding "MindGame → RewirePerform" ist **vollständig** (keine Treffer mehr im Code). Aus IT-Sicht **noch nicht launch-ready**: Der Security-Scan zeigt **3 kritische/erhöhte Befunde**, die vor Go-Live behoben werden müssen. Build/TS/Routing sind sauber.

---

## Kritische Security-Findings (MÜSSEN vor Launch gefixt werden)

### 1. Privilege Escalation auf `user_roles` (ERROR – kritisch)
Die Policy **„Users can insert own role"** erlaubt jedem eingeloggten User, sich selbst die Rolle `admin` oder `coach` zuzuweisen. Da `has_role()` direkt aus dieser Tabelle liest, hebelt das **das gesamte Rechtesystem aus** (inkl. neuer Admin Control Center).

**Fix:** Self-Service-INSERT-Policy droppen. Rollenvergabe darf nur durch:
- den DB-Trigger bei Signup (läuft als `SECURITY DEFINER`, ignoriert RLS) und
- eine neue Admin-only-Policy (`has_role(auth.uid(),'admin')`)
erfolgen.

### 2. Team-Access-Codes für alle sichtbar (ERROR – kritisch)
Policy **„Anyone authenticated can view teams"** mit `USING (true)` exponiert die `access_code`-Spalte aller Teams an jeden eingeloggten Athleten. Jeder kann Codes auslesen und beliebigen Teams beitreten.

**Fix:** SELECT-Policy ersetzen, sodass ein User nur Teams sieht, in denen er Mitglied ist oder die er selbst erstellt hat:
```sql
USING (
  created_by = auth.uid()
  OR id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
)
```
Beitritt per Code läuft weiterhin über die bestehende RPC (SECURITY DEFINER), die den Code prüft – kein UX-Bruch.

### 3. RLS-Policies adressieren `public` statt `authenticated` (WARN)
Auf `assessments`, `deep_profile_assessments`, `feedback`, `personalized_tasks (DELETE)` greifen Policies für die `public`-Rolle. Bei `auth.uid() IS NULL` (anonym) könnten Zeilen mit `user_id IS NULL` durchrutschen. `user_id` ist auf 3 von 4 Tabellen nullable.

**Fix:** Policies droppen und mit `TO authenticated` neu anlegen, gleiche Bedingung. Kein Funktionsverlust.

---

## Mittlere Findings (vor Launch ratsam, kein Blocker)

### 4. Leaked Password Protection deaktiviert (WARN)
HaveIBeenPwned-Check ist aus. Empfehlung: in den Auth-Settings via `cloud--configure_auth` aktivieren (Schutz vor bekannt geleakten Passwörtern bei Signup/Reset). **Aktion:** Ein-Klick-Konfiguration, kein Code.

### 5. 16× „SECURITY DEFINER function executable" (WARN)
Betrifft Helper-Funktionen wie `has_role`, Signup-Trigger, Team-Join-RPC. Diese **müssen** SECURITY DEFINER bleiben (sonst funktioniert RLS-Vermeidung im Trigger nicht). Lovable/Supabase-Standard – wird als bewusste Architekturentscheidung **als „ignored" markiert** mit Begründung in der Security-Memory. Kein echter Bug.

---

## Branding-Polish (klein, nice-to-have)

`index.html` enthält noch Lovable-Default-Einträge:
- `og:image` und `twitter:image` → `https://lovable.dev/opengraph-image-p98pqg.png`
- `twitter:site` → `@Lovable`

**Fix:** Auf Platzhalter mit `/app-icon.png` (lokal) und `@RewirePerform`-Handle (oder entfernen) umstellen. Wichtig für sauberes Link-Sharing (WhatsApp/Discord-Previews) bei Go-Live.

---

## Was NICHT gemacht wird

- Keine Änderung an Programm-Inhalten, Tasks, Daily-Flow, Coach-Logik.
- Keine neuen Tabellen, keine Datenmigration.
- Keine UX-Änderung für Athleten/Coaches – Team-Beitritt per Code funktioniert weiter über RPC.
- Bestehende Admin-Funktionalität bleibt erhalten (Admin-Rolle wird weiterhin via `is_admin`-Funktion / Trigger gesetzt).

---

## Umsetzungsschritte (in Default-Mode)

1. **Migration** `harden_rls_pre_launch.sql`:
   - DROP Policy `"Users can insert own role"` auf `user_roles`
   - CREATE Policy `"Admins can manage user_roles"` (INSERT/UPDATE/DELETE für `has_role(auth.uid(),'admin')`)
   - DROP + RECREATE Policy `"Anyone authenticated can view teams"` → mitgliedsbasiert
   - DROP + RECREATE die 7 `public`-Policies auf `assessments`, `deep_profile_assessments`, `feedback`, `personalized_tasks` mit `TO authenticated`
2. **Auth-Setting**: Leaked Password Protection aktivieren.
3. **index.html**: OG/Twitter-Tags auf RewirePerform-Werte setzen.
4. **Security-Memory** updaten: SECURITY-DEFINER-Funde als bewusst ignorieren begründen.
5. **Re-Scan**: `security--run_security_scan` + `supabase--linter` zur Verifikation.
6. **Smoke-Test (manuell, durch dich)** mit Test-Account: Athlet-Login → Daily-Flow, Team beitreten per Code, Coach-Login → Team-Übersicht, Admin-Login → /admin.

Nach diesen Schritten: **launch-ready aus IT-Sicht.**
