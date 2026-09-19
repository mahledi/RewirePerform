# RewirePerform V1.1 – Organisationsanfrage Staging-Assurance

Stand: 10. August 2026
Status: Staging installiert und negativ verifiziert; öffentliche Annahme bleibt fail-closed

## Praktische Bedeutung

Die Organisationsanfrage ist in der getrennten Supabase-Staging-Umgebung
technisch vorhanden. Datenbankgrenzen, Rollen, DE-/Privacy-Scope und die Edge
Function sind geprüft. Ohne echten Cloudflare-Turnstile-Schlüssel und ohne das
explizite Staging-Aktivierungsflag nimmt der Endpunkt keine Anfrage an.

Dieser Nachweis ist ausdrücklich keine Production-, App-Store-, TestFlight-,
Feedback- oder Jarvis-Aktivierung.

## Eingefrorene Quelle

- Release-Branch: `codex/v1-1-release-final-20260809`
- geprüfter Release-HEAD: `ab787c41922855fe6429f4d64e542c647814c84e`
- Draft-PR: `#116`
- Staging-Projekt: `RewirePerform Staging`
- Staging-Projekt-ID: `zbeswjipayspgvcipzmx`
- Region: `eu-central-1`

## Datenbankmigration

Die Organisationsmigration wurde einzeln über die Supabase-Migrationsschnittstelle
angewendet. Ein allgemeines `supabase db push` wurde bewusst nicht verwendet,
weil die Staging-Historie eigene importierte Versionsnummern besitzt und die
Feedback-Kette nicht still erweitert werden darf.

- Quelldatei:
  `supabase/migrations/20260807092005_coach_enterprise_onboarding_v1_1.sql`
- lokale SHA-256:
  `d16aa78f46156ebaa1201f808c04050f6e07e87cf655b59e02df18f6025c100c`
- Remote-Migrationsname: `coach_enterprise_onboarding_v1_1`
- Remote-Version: `20260809193704`

Die zwei additiven Folgebausteine wurden am 10. August ebenfalls einzeln und
ohne allgemeinen Migrationspush angewendet:

- Team-/Organisationspfad:
  - Quelldatei:
    `supabase/migrations/20260810082841_extend_organization_inquiry_team_path_v1_1.sql`
  - lokale SHA-256:
    `3dcb8f26a6103cc97f3a1ebadb76e6fdb3cfad864c276451ac127a54f036a268`
  - Remote-Migrationsname: `extend_organization_inquiry_team_path_v1_1`
  - Remote-Version: `20260810093124`
- Aufbewahrung und Fake-/Spam-Löschung:
  - Quelldatei:
    `supabase/migrations/20260810091629_organization_inquiry_retention_v1_1.sql`
  - lokale SHA-256:
    `8ebd6d6cc7b3f8a360450b1898249a2b9a308072230919cbed0a6212d5aff543`
  - Remote-Migrationsname: `organization_inquiry_retention_v1_1`
  - Remote-Version: `20260810093132`

Der tägliche Aufbewahrungsjob existiert genau einmal und ist aktiv:
`organization-inquiry-retention-daily`, `17 4 * * *`, Datenbank `postgres`,
Ausführung als `postgres`. Er löscht ausschließlich `declined` oder
`withdrawn`, deren letzte Änderung mehr als 365 Tage zurückliegt. Genehmigte
und aktive Beziehungen sind ausgeschlossen.

Der Preflight zeigte in Staging keine vorhandene Organisation und kein Team,
das einen Legacy-Backfill ausgelöst hätte. Nach dem Apply waren weiterhin alle
sechs Organisationsdatentabellen leer.

## Edge Function

- Slug: `submit-organization-access-request`
- Deployment-ID: `aab4885c-9e85-48d3-bf7e-583c2f564b64`
- Version: `5`
- Status: `ACTIVE`
- `verify_jwt=false` ist für diesen öffentlichen Eingang beabsichtigt; die
  Function erzwingt stattdessen Origin-Allowlist, Turnstile, Payloadgrenzen,
  DE-Scope, Notice-Version und ein separates Aktivierungsflag.
- Bundle-Kennung:
  `73a65da5ac16ca86a026257a6f6e768beee9a85e84e394f154831c6d58c89505`

Remote und lokal wurden für alle drei ausgelieferten Dateien bytegleich
verglichen:

- `index.ts`:
  `62f033015349d64a8217bd76015ce204e9699c9fac9b9aeea9679aa8dde9b643`
- `_shared/boundedRequestBody.ts`:
  `7a707eb6a54df88e2314439658aca1fb53f7c666f53d58fd6a1dfd241323568e`
- `_shared/supabaseService.ts`:
  `5310e93594f4088266845f21472b6c6f77d3b67e8bc26191b916e84dc2c4cd9e`

## Sicherheits- und Privacy-Nachweis

- RLS ist auf allen sieben neuen Tabellen aktiv; die Machine-View besitzt
  keine direkten Rechte für `anon`, `authenticated` oder `service_role`.
- `anon` besitzt auf keiner Organisationsrelation SELECT oder RPC-EXECUTE.
- Der öffentliche Edge-Pfad kann nur die service-only Submit-RPC ausführen;
  `authenticated` besitzt darauf kein EXECUTE.
- Admin-/Coach-RPCs sind `SECURITY DEFINER`, gehören `postgres`, verwenden
  exakt `search_path=pg_catalog` und prüfen vor Datenzugriff `auth.uid()`,
  Adminrolle, aktive Organisationsrolle, aktive `lead_coach`-Mitgliedschaft
  oder bestätigte Einladungs-E-Mail.
- Vier historische Coach-/Creator-Policies wurden entfernt. Die neuen Policies
  binden Administration an aktive Rollen statt an `teams.created_by`.
- Anfrage und Organisation sind server- und datenbankseitig auf `DE` begrenzt.
- Neue Anfragen verwenden exakt
  `organization-inquiry-v1.1-2026-08-10`; die vorherige Staging-Version
  `organization-inquiry-v1.1-2026-08-07` bleibt nur migrationssicher lesbar.
- Die Machine-View besitzt weiterhin keinerlei Rechte für `PUBLIC`, `anon`,
  `authenticated` oder `service_role`; der neue Teamname erweitert deshalb
  keinen Machine-/Jarvis-Zugriff.
- Die Aufbewahrungsfunktion ist ausschließlich für ihren Eigentümer
  ausführbar. Die sofortige Fake-/Spam-Löschung ist nur für angemeldete
  Plattform-Admins nach der exakten Bestätigung `DELETE_FAKE_OR_SPAM`
  ausführbar und verweigert genehmigte oder aktive Anfragen.
- Alle Feedback-, Freitext-, Minor-, App-Store-, Consumer-, Synthetic-,
  Production- und Machine-Credential-Gates blieben `false`.

## Staging-Smokes

HTTP-Negativpfade gegen die reale Staging-Edge-Function:

- POST ohne Origin: `403 origin_not_allowed`
- POST mit fremdem Origin: `403 origin_not_allowed`
- POST mit erlaubtem Origin bei geschlossenem Gate:
  `503 service_not_available`
- erlaubtes CORS-Preflight: `200 ok`

Die Edge-Logs enthalten für diesen Test nur Methode, Status, Function und
Laufzeit; keine Request-Payload oder personenbezogenen Felder.

Der erweiterte transaktionale Datenbank-Smoke wurde vollständig zurückgerollt:

- kurzer Einzelteamweg mit Teamname, `team_count_band=1` und atomischem
  Submitted-Event: grün;
- vertiefter Organisationsweg ohne Teamname: grün;
- inkonsistenter Einzelteamweg ohne Teamname: datenbankseitig abgelehnt;
- mehr als 365 Tage alte abgelehnte Anfrage samt Event gelöscht: grün;
- 364 Tage alte abgelehnte und 500 Tage alte genehmigte Anfrage erhalten:
  grün;
- falsche Fake-/Spam-Bestätigung abgelehnt, exakte Admin-Bestätigung löscht:
  grün;
- genehmigte Anfrage auch mit Adminbestätigung nicht löschbar: grün;
- der dafür rein transaktional erzeugte synthetische Admin wurde gemeinsam
  mit allen Fixtures zurückgerollt;
- abschließende Zählung: Anfragen `0`, Events `0`, Auth-Nutzer `0`, Rollen `0`.

## Advisor-Einordnung

Der Supabase-Security-Advisor meldet keine Fehler, aber projektweit INFO- und
WARN-Hinweise. Die für diesen Block relevanten INFO-Hinweise
`rls_enabled_no_policy` betreffen absichtlich geschlossene Tabellen, deren
direkte Rechte zusätzlich negativ geprüft wurden. Die relevanten WARN-Hinweise
zu authentifizierten `SECURITY DEFINER`-Funktionen sind beabsichtigt: Der
Aufruf ist möglich, der Datenzugriff aber erst nach den fest implementierten
Admin-, Einladungs-, Organisations- oder aktiven Teamrollenprüfungen. Die neue
Fake-/Spam-Funktion wurde zusätzlich mit positivem und negativem Rollenpfad
transaktional geprüft. Referenz:
https://supabase.com/docs/guides/database/database-linter

Der Performance-Advisor meldet mehrere nicht indexierte Fremdschlüssel in den
neuen, aktuell leeren Organisationsrelationen. Das ist kein Korrektheits- oder
Zugriffsblocker für den Staging-Smoke, bleibt aber ein klarer Performance-
Hardening-Punkt vor breiterem realem Organisationsbetrieb.

## Ehrlich offene Gates

1. Im Cloudflare-Konto muss ein echtes Turnstile-Widget für die vorgesehenen
   Hosts angelegt werden. Ein neuer Login/OAuth wurde nicht eigenständig
   gestartet.
2. Erst danach dürfen Site-Key, Staging-Secret und
   `ORGANIZATION_INQUIRY_PUBLIC_ENABLED=true` ausschließlich in Staging gesetzt
   werden.
3. Danach folgt genau ein positiver synthetischer End-to-End-Request sowie die
   erneute Negativmatrix. Die erzeugte Fixture wird anschließend gelöscht und
   die Nullzählung erneut bestätigt.
4. Production, signierter iPhone-Build, TestFlight und App Store bleiben eigene
   Freigabeschritte.
