# Feedback Intelligence Machine Gateway v0.1 – unsigned Producer-Handoff

Stand: 7. August 2026
Status: `PRODUCER_PREPARED_UNSIGNED_NOT_ACTIVATED`

## Bedeutung

Der eng begrenzte Jarvis-Transport ist im isolierten Producer-Worktree lokal
vorbereitet und mit synthetischen Daten ausführbar getestet. Es existieren
weiterhin kein Machine-Key, kein Reader-Passwort, kein Deployment und kein
Netzwerk-Read. Sämtliche Collection-, Machine-, Staging-Read-, Production- und
Real-Data-Gates bleiben geschlossen.

Die bestehenden 55 Fragen, das v0.2-Exportformat, Consent, Guardian-Prüfung,
DE-Filter, Kohortenunterdrückung und Privacy-Grenzen wurden nicht umbenannt.
Der Gateway-Pin wurde auf Semantikpaket `0.3.1-draft` aktualisiert: Vier
Rest-Day-Fragen bilden nun die im finalen Content-Commit vorgegebene
Sportsituation statt einer frei gewählten eigenen Szene ab. IDs, Skalen,
Antwortwerte und Exportform bleiben unverändert.

## Exakter HTTP-Vertrag

- Host: `zbeswjipayspgvcipzmx.supabase.co`
- Methode/Pfad: `POST /functions/v1/mahleos-feedback-intelligence-read`
- Content-Type: `application/json`
- Authorization: `Bearer <64 lowercase hex>`
- `X-MahleOS-Request-Id`: lowercase UUID v1–v5
- `X-MahleOS-Nonce`: 64 lowercase hex; in PostgreSQL nur als SHA-256 gespeichert
- `X-MahleOS-Request-Timestamp`: RFC3339/UTC; höchstens 5 Minuten alt und
  höchstens 1 Minute in der Zukunft
- Body: exakt das Schema
  `contracts/machine-gateway-v0.1/request.schema.json`, maximal 1.024 Bytes
- Erfolg: HTTP 200 und exakt der bestehende v0.2-Export ohne neues Envelope;
  `X-MahleOS-Request-Id` wird als Response-Header gespiegelt
- Fehler: allowgelistetes JSON `{ "error": "...", "request_id": "..." }`;
  vor einer gültigen Request-ID kann `request_id` fehlen
- Response-Limit: 8 MiB; keine Redirects, kein Browser-CORS, `no-store`

Die kanonische maschinenlesbare Fassung einschließlich Statuscodes liegt in
`contracts/machine-gateway-v0.1/gateway-contract.json`.

## Datenbankrolle und Grants

Die additive Migration erzeugt `mahleos_feedback_reader` als `LOGIN` mit
`PASSWORD NULL`, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOINHERIT`,
`NOREPLICATION` und `NOBYPASSRLS`. Repository-seitig werden nur folgende
positiven Rechte gesetzt:

1. `CONNECT` auf die aktuelle Datenbank;
2. `USAGE` auf `public`;
3. `EXECUTE` auf
   `public.read_feedback_intelligence_v0_2_draft(text,text,text,text)`.

Direkte Tabellen-, Sequenz-, Raw-, Consent-, Activity- und Analysis-Rechte
werden entzogen. `PUBLIC`, `anon`, `authenticated` und `service_role` dürfen den
Gateway-RPC nicht ausführen. Die Edge Function verwendet ausdrücklich weder
`service_role` noch `SUPABASE_DB_URL`, sondern später ausschließlich den
separaten, rollengebundenen Secret-Namen
`MAHLEOS_FEEDBACK_READER_DATABASE_URL`.

Der ursprüngliche Exportkörper liegt hinter dem öffentlichen Wrapper in
`feedback_analysis.export_feedback_intelligence_v0_2_internal(...)`. Nur der
Wrapper erhält einen Runtime-Grant. Der Wrapper akzeptiert ausschließlich den
exakten Jarvis-Client, den exakten Contract-/Schema-Pin und `synthetic`.
`production` wird unabhängig von allen Tabellen-Gates hart abgelehnt.

## Replay, Rate Limit und Audit

Replay und Rate Limit liegen nicht nur im flüchtigen Edge-Isolate. PostgreSQL
serialisiert Requests pro Client per Advisory Transaction Lock. Request-ID und
Nonce sind eindeutig; der Nonce wird nur gehasht gespeichert. Maximal zwölf
authentifizierte Requests pro Minute werden bearbeitet, Replay-Versuche zählen
mit. Auditzeilen enthalten nur Request-ID, Client-ID, Outcome und Zeitpunkt –
keine Antwort, keinen Machine-Key, keine Athletenkennung und keinen
Feedbacktext.

## Explizite Deltas zum Jarvis-Vorschlag

1. Der Jarvis-Vorschlag definierte noch keine Replay-Header. Producer-seitig
   sind nun Request-ID, 64-Hex-Nonce und Timestamp verbindlich. Der Consumer
   muss diese drei Header vor einem Netzwerk-Test bytegenau adaptieren.
2. Zusätzlich zum Jarvis-Machine-Key benötigt die Edge Function intern eine
   getrennte Datenbank-URL für genau `mahleos_feedback_reader`. Jarvis sieht
   dieses Secret nie.
3. Replay/Rate Limit ist persistent und transaktionssicher statt ausschließlich
   In-Memory.
4. Der alte minimale Access-Log-Count erlaubte nur 100 Items, obwohl der
   Exportvertrag 5.000 erlaubt und der 55-Fragen-Report mehr als 100 enthalten
   kann. Der additive Gateway-Block gleicht den Count-Bound auf 5.000 an; der
   Response-Vertrag ändert sich nicht.
5. PostgreSQL kann einem einzelnen Role-Mitglied keine von `PUBLIC` geerbten
   Function-Rechte explizit verweigern. Die Migration erteilt direkt nur den
   einen RPC-Grant und die relevanten Feedback-/Admin-/Consent-RPCs sind lokal
   negativ getestet. Vor Passwortvergabe bleibt dennoch ein vollständiger
   Staging-Audit aller effektiven `PUBLIC`-Function-Rechte verbindlich.

Es wurde nichts still umbenannt. Endpoint, Rolle, Upstream-Signatur,
Client-ID, v0.2-Schema-Pin, v0.3.1-Paket, 55-Fragen-Katalog und DE-Scope stimmen
mit dem Jarvis-Handoff überein.

## Lokale Negativ- und Vertragstests

Geprüft sind:

- fehlender, falscher, zu kurzer und falsch formatierter Machine-Key;
- malformed Rotation-Key fail-closed;
- Replay von Request-ID/Nonce;
- dreizehnter authentifizierter Versuch innerhalb einer Minute;
- `anon`, `authenticated` und `service_role` ohne Execute;
- Reader ohne direkten Tabellen-/Raw-/Replay-Tabellenzugriff;
- AT-Datensatz nicht exportiert;
- Production-Scope blockiert;
- falscher Schema-Pin blockiert;
- weniger als fünf DE-Subjects ergibt leeres `items`-Array;
- Under-16-Freitext-Consent ohne Guardian-Scope wird schon beim Receipt
  abgewiesen; strukturierte Antwort bleibt exportierbar;
- erfolgreicher Output bleibt v0.2-schema-valide und enthält weiterhin nur
  consentierten Freitext.

## Bewusster Stop

Vor einem ersten synthetischen Netzwerk-Read bleiben mindestens offen:

1. Consumer-Adaption und Review der drei Replay-Header;
2. vollständiger effektiver Staging-Role-/`PUBLIC`-Privilege-Audit;
3. signiertes Producer-/Consumer-Paar;
4. getrennte Freigabe für Migration und Edge-Deployment im Staging;
5. danach getrennte Erzeugung von Reader-Passwort und Machine-Key;
6. explizites Öffnen ausschließlich der synthetischen Machine-Gates;
7. eigene Freigabe für genau einen synthetischen Netzwerk-Read.

Production, echte Athletendaten und reale Freitexte sind kein Teil dieses
Handoffs und bleiben technisch blockiert.
