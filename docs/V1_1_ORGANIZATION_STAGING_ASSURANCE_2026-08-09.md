# RewirePerform V1.1 – Organisationsanfrage Staging-Assurance

Stand: 9. August 2026  
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
- geprüfter Release-HEAD: `578cccdab472f4de3487321aa8f6e91f3bf964e6`
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

Der Preflight zeigte in Staging keine vorhandene Organisation und kein Team,
das einen Legacy-Backfill ausgelöst hätte. Nach dem Apply waren weiterhin alle
sechs Organisationsdatentabellen leer.

## Edge Function

- Slug: `submit-organization-access-request`
- Deployment-ID: `aab4885c-9e85-48d3-bf7e-583c2f564b64`
- Version: `1`
- Status: `ACTIVE`
- `verify_jwt=false` ist für diesen öffentlichen Eingang beabsichtigt; die
  Function erzwingt stattdessen Origin-Allowlist, Turnstile, Payloadgrenzen,
  DE-Scope, Notice-Version und ein separates Aktivierungsflag.
- Bundle-Kennung:
  `94b3f21e115991a9193551cf30ecc9a7e3e194a5e34b1243dbe0b073dde7b309`

Remote und lokal wurden für alle drei ausgelieferten Dateien bytegleich
verglichen:

- `index.ts`:
  `4a15863db2b0a1fffbc4986b389462dadf4d7331e5dec2ad0daadd09839ee2b4`
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
- Die Notice-Version ist exakt
  `organization-inquiry-v1.1-2026-08-07`.
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

Der transaktionale Datenbank-Smoke wurde vollständig zurückgerollt:

- gültiger synthetischer DE-Request und atomisches Submitted-Event: grün;
- AT und falsche Notice-Version: abgelehnt;
- doppelter offener Request: abgelehnt;
- `anon`/`authenticated` gegen service-only Submit-RPC: abgelehnt;
- abschließende Fixture-Zählung: überall `0`.

## Advisor-Einordnung

Der Supabase-Security-Advisor meldet keine Fehler. Vier INFO-Hinweise
`rls_enabled_no_policy` betreffen absichtlich private/service-only Tabellen,
deren direkte Rechte zusätzlich negativ geprüft wurden. Warnungen zu
authentifizierten `SECURITY DEFINER`-Funktionen sind durch die oben genannten
festen Authentisierungs- und Rollenprüfungen begrenzt.

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

