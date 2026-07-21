# MahleOS Read API Contract

Stand: 21. Juli 2026

Status: lokaler Integrationskandidat auf
`codex/mahleos-read-contract-20260721`. Die Migration ist lokal gegen einen
ausfuehrbaren PostgreSQL-Harness geprueft. Keine neue Migration, Edge Function,
Umgebungsvariable oder MahleOS-Verbindung wurde auf Production aktiviert.

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

- `mahleos-system-health-v1`
- `mahleos-tracking-quality-v1`
- `mahleos-feedback-status-v1`

MahleOS muss unbekannte Schema-Versionen ablehnen und einen menschlichen Review
anfordern. Es darf Felder nicht still umdeuten.

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
2. Migration `20260721082355_add_mahleos_operational_read_contract.sql`
   kontrolliert anwenden und Grants, RLS, Trigger sowie Security Advisor
   nachpruefen.
3. 256-Bit-Schluessel lokal erzeugen und getrennt als Edge Secret sowie im
   MahleOS Keychain hinterlegen.
4. `mahleos-read` und die aktualisierte `evidence-read` Function deployen.
5. Ohne Key, mit falschem Key, altem Rotations-Key, unbekannter View,
   unbekanntem Run und Rate Limit negativ testen.
6. Mit synthetischem Run und synthetischem Data Lock positiv testen.
7. Erst danach MahleOS auf den Production-Endpunkt umstellen.

Keine dieser Aktivierungsaktionen ist durch den lokalen Implementierungsauftrag
impliziert.

## Lokale Pflichtpruefung

```bash
npm test -- src/test/mahleOsMachineAuth.test.ts \
  src/test/mahleOsReadContract.test.ts \
  src/test/evidenceReadContract.test.ts
npm run test:mahleos:sql
```

Der SQL-Harness prueft reale PostgreSQL-Funktionsausfuehrung, Rollenrechte,
Append-only Audit, Request-Replay, Rate Limit, Production-/QA-Trennung,
Feedback-Freitextschutz, Pilotstatus bei unvollstaendiger und vollstaendiger
Autorisierung sowie `n = 5`/Low Confidence.
