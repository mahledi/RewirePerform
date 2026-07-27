# MahleOS Read API Contract

Stand: 27. Juli 2026

Status: Der V1.2-Produzentenvertrag ist lokal implementiert und noch nicht in
`main` integriert oder auf Production aktiviert. Er ergaenzt eine explizite
Abdeckungskarte fuer Login, Registrierung, Teambeitritt und
Minderjaehrigenautorisierung. Keine Migration, Edge Function,
Umgebungsvariable oder Verbindung wurde dadurch auf Production aktiviert.

## Zweck

MahleOS erhaelt zwei voneinander getrennte, nur lesende RewirePerform-Vertraege:

1. `mahleos-read` liefert aktuelle technische und operative Aggregate fuer den
   taeglichen Kontrollbericht.
2. `evidence-read` liefert ausschliesslich vorher durch einen Admin gesperrte,
   pruefsummenverifizierte Evidence Data Locks.

Keiner der Endpunkte ist ein Admin-Login, allgemeiner Supabase-Zugang oder
Ersatz fuer eine fachliche Auswertung. MahleOS erhaelt keinen Service-Role-Key.

## Gemeinsame Authentifizierung

Beide Endpunkte verwenden denselben rotierbaren Machine-to-Machine-Vertrag:

- `MAHLEOS_REWIRE_API_KEY`: aktueller Schluessel
- `MAHLEOS_REWIRE_API_KEY_PREVIOUS`: optionaler alter Schluessel waehrend einer
  kurzen Rotation
- Format: exakt 64 Hex-Zeichen, also 256 Bit Entropie
- Transport: `Authorization: Bearer <machine-key>`
- Speicherung: nur als Supabase Edge Secret und im macOS Keychain von MahleOS
- niemals in Browser, iOS-App, Repository, Chat, Doku, URL oder Query-Parameter

Erzeugung nach gesonderter Aktivierungsfreigabe:

```bash
openssl rand -hex 32
```

Die Function vergleicht nur SHA-256-Digests in konstanter Zeit. Ein fehlender
oder formal falscher aktueller beziehungsweise vorheriger Schluessel schaltet
den Dienst fail-closed auf `service_not_configured`.

## Operations Endpoint

```text
POST https://<project-ref>.supabase.co/functions/v1/mahleos-read
Content-Type: application/json
Authorization: Bearer <64-hex-machine-key>
```

Browser-CORS ist absichtlich nicht aktiviert. Erlaubt sind nur JSON-POSTs bis
2048 Byte. Zusaetzliche Body-Felder werden abgewiesen.

### `daily_brief`

Request:

```json
{"view":"daily_brief"}
```

Enthaelt gemeinsam:

- `system_health` mit fest definierten Identitaets-, Programm- und
  Tracking-Integritaetszaehlern
- technische Fehlerzaehler der letzten 24 Stunden fuer feste Kernflows
- eine explizite Abdeckungskarte, die nicht verbundene oder nur teilweise
  beobachtete kritische Nutzerpfade niemals als gesund ausgibt
- Push-Zustellung der letzten sieben Tage
- `tracking_quality` mit Aktivitaet, Instance-Scope, Doppelzeilen und
  atomaren Check-in-/Completion-Abweichungen
- `feedback_status` als Backlog-Zaehler ohne Text
- klare Claim Boundary: operatives Monitoring, keine Wirksamkeits- oder
  Kausalaussage

### Einzelansichten

```json
{"view":"system_health"}
```

```json
{"view":"tracking_quality"}
```

```json
{"view":"feedback_status"}
```

Diese Antworten verwenden die Schema-Versionen:

- `mahleos-system-health-v1.2`
- `mahleos-tracking-quality-v1`
- `mahleos-feedback-status-v1`

MahleOS muss unbekannte Schema-Versionen ablehnen und einen menschlichen Review
anfordern. Es darf Felder nicht still umdeuten.

`critical_journey_coverage` trennt vier unterschiedliche Beweisstaerken:

- Loginfehler bleiben `NOT_CONNECTED`, bis Supabase-Auth-Logs ueber einen
  separat freigegebenen read-only Connector erreichbar sind.
- Registrierung ist `STRUCTURAL_ONLY`: fehlende Profile oder Rollen sind
  serverseitig sichtbar, der fehlgeschlagene Auth-Versuch selbst noch nicht.
- Teambeitrittsfehler sind `ADVISORY_ONLY` und werden nach bestehender
  Authentifizierung ohne Teamcode, E-Mail oder freien Fehlertext erfasst.
- Minderjaehrigenautorisierung ist vor Enforcement `NOT_CONNECTED`; danach
  werden nur Struktur und Guardian-Zustellfehler aggregiert, niemals Alter,
  Guardian-Adresse, Receipt oder individuelle Entscheidung.

### Pilotkatalog

```json
{"view":"pilot_catalog"}
```

`mahleos-pilot-catalog-v1` liefert hoechstens 20 aktive Production-Runs mit
opaker Run-ID und wenigen Readiness-Zaehlern. Teamname, Team-ID, Coach- und
Athletenidentitaet bleiben ausgeschlossen. `truncated: true` erzwingt einen
nicht-gruenen Consumer-Zustand statt stiller Vollstaendigkeitsannahme.

### Pilot Readiness

```json
{
  "view": "pilot_readiness",
  "program_run_id": "00000000-0000-4000-8000-000000000000"
}
```

Die Antwort `mahleos-pilot-readiness-v1` enthaelt nur laufbezogene Zaehler:

- Run-Status und aktueller Programmtag
- Anzahl Athleten und Programminstanzen
- aktuelle Evidence-Berechtigung als Anzahl, einschliesslich der
  Minderjaehrigen-/Guardian-/Assent-Regeln des aktiven Protokolls
- Abdeckung der validierten Pre-Messung
- Tag 1, Check-ins heute, aktive und inaktive Athleten der letzten sieben Tage
- erwartete und abgeschlossene Transfer-Messpunkte
- faellige und abgeschlossene woechentliche Team-Coach-Reviews
- technische Integritaet einschliesslich doppelter oder falsch zugeordneter
  Programminstanzen, `n >= 5` und Low Confidence bei `n = 5` bis `9`

Nicht enthalten sind Teamname, Coachname, Athletennamen, User-IDs, Listen
fehlender Spieler, Einzelwerte oder Coach-Beobachtungswerte. QA-Runs liefern
`TEST_EXCLUDED` und fliessen nicht in Production-Berichte ein.

`GREEN` setzt zusaetzlich voraus, dass alle Athleten Tag 1 abgeschlossen haben,
in den letzten sieben Tagen aktiv waren und alle bis zum aktuellen Programmtag
faelligen Transferpunkte sowie unterschiedlichen Coach-Wochen vorliegen.
Zukuenftige Transferpunkte und mehrere Coach-Eintraege derselben Woche koennen
fehlende faellige Messungen nicht ersetzen.

### Solo Readiness

```json
{"view":"solo_readiness"}
```

`mahleos-solo-readiness-v1` liefert ausschliesslich operative Zaehler fuer
aktive Production-Solo-Instanzen: Evidence-Berechtigung, validierte
Pre-Messung, Aktivitaet, Day 1 und faellige Transfer-Messpunkte. Sportkategorie
und Leistungsniveau erscheinen erst, wenn innerhalb der konkreten Kohorte
mindestens fuenf aktuell Evidence-berechtigte Athleten vorliegen. Kleinere
Kohorten liefern nur einen Suppression-Hinweis ohne Sportdimension.

### Evidence-Status

```json
{"view":"evidence_status"}
```

`mahleos-evidence-status-v1` liefert nur aktive Production-Data-Lock-Metadaten,
opake Lock- und Run-Referenzen sowie den serverseitig berechneten
Pruefsummenstatus. Evidence-Payload, Analysemanifest, Ersteller und
Invalidierungsdetails werden hier niemals ausgegeben. Der eigentliche
freigegebene Payload bleibt ausschliesslich dem separaten `evidence-read`
Endpunkt vorbehalten.

## Maschinenlesbares Handoff

`docs/mahleos-handoff/contracts/v1/` enthaelt:

- Transport- und Privacy-Manifest `manifest.json`
- JSON-Schemas mit geschlossenen Top-Level-Vertraegen
- synthetische Golden Responses fuer alle acht Operations-Ansichten
- Golden Response fuer `evidence-read`
- vollstaendige dokumentierte Fehlerantworten

Die Dateien werden aus `scripts/generate-mahleos-contract.mjs` erzeugt und in
CI mit `npm run mahleos:contract:check` gegen Drift geschuetzt. MahleOS muss
das Paket an einen reviewten RewirePerform-Commit pinnen.

### Erfolgsantwort

```json
{
  "ok": true,
  "request_id": "00000000-0000-4000-8000-000000000000",
  "view": "daily_brief",
  "checksum_algorithm": "sha256",
  "response_checksum": "<64-hex>",
  "data": {
    "schema_version": "mahleos-daily-brief-v1",
    "reporting_timezone": "UTC"
  }
}
```

Alle datumsbasierten Zaehler deklarieren `reporting_timezone: "UTC"`.

MahleOS muss Request-ID und Pruefsumme im eigenen Laufprotokoll speichern. Die
Pruefsumme ist eine serverseitig erzeugte Audit-Referenz fuer den freigegebenen
Payload; sie wird nicht aus dem nach dem Transport erneut serialisierten
`data`-Objekt berechnet. Die Transportintegritaet wird durch HTTPS geschuetzt.

### Fehler

| HTTP | Code | Bedeutung |
|---|---|---|
| 400 | `invalid_request` / `invalid_json` | Body oder Scope nicht erlaubt |
| 401 | `unauthorized` | Machine-Key fehlt oder ist falsch |
| 404 | `not_found` | freigegebener Run/Lock nicht vorhanden |
| 405 | `method_not_allowed` | kein POST |
| 413 | `request_too_large` | Body oberhalb der Grenze |
| 415 | `unsupported_media_type` | kein JSON |
| 429 | `rate_limited` | mehr als 30 Requests pro Client und Minute |
| 503 | `service_not_configured` / `operations_read_unavailable` | sichere Konfiguration oder Backend nicht verfuegbar |

## Evidence Endpoint

`evidence-read` bleibt ein eigener Vertrag. Er liest keine Live-Trackingdaten,
sondern nur aktive Data Locks mit gueltiger SHA-256-Pruefsumme.

Unterstuetzte Scopes:

- `program_run` mit `program-run-evidence-lock-v2-2026-07`
- `solo_aggregate` mit `solo-sport-evidence-lock-v2-2026-07`

MahleOS darf diese Daten fuer strukturierte Berichte vorbereiten. Externe
Veroeffentlichung, Wirksamkeitsclaim oder Investor-/NLZ-Versand bleibt eine
menschliche Entscheidung.

## Audit und Datenminimierung

Jeder erfolgreiche, abgewiesene, nicht gefundene oder rate-limitierte
Operations-Request wird append-only mit folgenden Feldern protokolliert:

- Request-ID
- feste Client-ID
- View
- vorhandene Program-Run-ID
- Ergebnis
- Antwortpruefsumme
- Zeitpunkt

Der Audit enthaelt keinen Response-Payload, Namen, E-Mail, User-ID,
Feedbacktext oder privaten Athleteninhalt. Unbekannte Run-IDs werden nicht in
die Fremdschluesselspalte uebernommen.

## Explizit ausgeschlossen

- Journal, Dankbarkeit, Reflexion oder Freitext
- Feedback- und Supporttexte
- E-Mail-Adressen, Namen, User-IDs und Zugangscodes
- einzelne Check-in-Werte oder Zeitverlaeufe
- Rohantworten, einzelne Assessment-Scores oder psychologische Labels
- einzelne Coach-Beobachtungen
- beliebige SQL-, Tabellen-, Filter- oder Exportparameter
- Schreibzugriffe, Statusaenderungen, Nutzerkontakt oder Bugfix-Deployments

Support-E-Mails liest MahleOS spaeter ueber seinen getrennten, offiziell
autorisierten Mail-Connector. RewirePerform exportiert sie nicht ueber diese
API.

## Aktivierungsgate

Erst nach separater Production-Freigabe in dieser Reihenfolge:

1. Branch reviewen und vollstaendiges Repository-Gate erneut gruen ausfuehren.
2. Die bereits live registrierte Migration
   `20260721142328_preserve_legacy_team_instances_on_run_assignment.sql` gegen
   die Git-Datei abgleichen und nicht erneut ausfuehren.
3. Die noch ausstehenden Migrationen
   `20260721082355_add_mahleos_operational_read_contract.sql`,
   `20260721153000_extend_mahleos_operational_read_contract.sql` und
   `20260721181524_harden_mahleos_readiness_statuses.sql` kontrolliert in
   dieser Reihenfolge anwenden. Danach Grants, Funktionskonfiguration, Trigger
   und Security Advisor pruefen.
4. 256-Bit-Schluessel lokal erzeugen und getrennt als Edge Secret sowie im
   MahleOS Keychain hinterlegen.
5. `mahleos-read` und die aktualisierte `evidence-read` Function deployen.
6. Ohne Key, mit falschem Key, altem Rotations-Key, unbekannter View,
   unbekanntem Run und Rate Limit negativ testen.
7. Mit synthetischem Run und synthetischem Data Lock positiv testen.
8. Erst danach MahleOS auf den Production-Endpunkt umstellen.

Keine dieser Aktivierungsaktionen ist durch den lokalen Implementierungsauftrag
impliziert.

## Lokale Pflichtpruefung

```bash
npm test -- src/test/mahleOsMachineAuth.test.ts \
  src/test/mahleOsReadContract.test.ts \
  src/test/mahleOsContractPackage.test.ts \
  src/test/evidenceReadContract.test.ts \
  src/test/programRunLegacyMigration.test.ts
npm run mahleos:contract:check
npm run test:mahleos:sql
```

Der SQL-Harness prueft reale PostgreSQL-Funktionsausfuehrung, Rollenrechte,
Append-only Audit, Request-Replay, Rate Limit, Production-/QA-Trennung,
Feedback-Freitextschutz, Pilotstatus, Pilotkatalog, Solo-Suppression,
Evidence-Checksum-Status sowie jede erzeugte Erfolgsantwort gegen das
veroeffentlichte JSON-Schema.
