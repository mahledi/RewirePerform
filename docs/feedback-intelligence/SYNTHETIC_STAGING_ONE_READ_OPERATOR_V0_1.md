# Feedback Intelligence – synthetischer Staging-Einmal-Read v0.1

Stand: 8. August 2026
Status: `AWAITING_SECURE_SECRET_PROVISIONING`

## Bedeutung

Postdeploy-Datenbankaudit und Edge-Deployment-Evidence sind unabhängig durch
den Jarvis-Consumer akzeptiert. Der nächste Gate erlaubt genau einen
synthetischen DE-Staging-Read. Production, echte Feedbackzeilen und
Schreibzugriffe bleiben ausgeschlossen.

Der Read wurde noch nicht ausgeführt. Die vorhandene Supabase-Verbindung kann
Migrationen und Edge-Code verwalten, aber keine Edge Secrets setzen. Lokaler
CLI, In-App-Browser und Chrome besitzen aktuell keine authentifizierte
Supabase-Sitzung. Deshalb wurden weder Reader-Passwort noch Machine-Key erzeugt
oder übertragen.

## Unveränderliche Grenzen

- Staging-Projekt ausschließlich `zbeswjipayspgvcipzmx`.
- Endpoint ausschließlich `POST
  /functions/v1/mahleos-feedback-intelligence-read`.
- Datenbankrolle ausschließlich `mahleos_feedback_reader`.
- Kein `service_role`, kein Tabellenrecht und kein Production-Scope.
- Request ausschließlich `data_scope = synthetic` mit den bytegepinnten
  Client-, Contract- und Schemawerten.
- Exakt ein Netzwerkrequest. Kein automatischer Retry.
- Response wird nur im Prozess validiert. Rohresponse, Rohtext und
  `subject_reference` werden nicht persistiert.
- Nach dem Request werden Edge- und Datenbank-Gate geschlossen und das
  Metadaten-/Privilege-Audit erneut ausgeführt – unabhängig vom HTTP-Ergebnis.

## Vorbereitete Producer-Migrationen

1. `20260808074346_feedback_intelligence_synthetic_staging_read_gate_v0_1.sql`
   öffnet nur `consumer_pin_ready`, `synthetic_export_enabled` und
   `machine_credential_ready` gegen die exakten v0.2-Pins. Alle
   Production-/Privacy-/App-Store-/Minor-Gates werden ausdrücklich auf `false`
   gehalten.
2. `20260808074742_feedback_intelligence_synthetic_staging_read_gate_close_v0_1.sql`
   setzt `consumer_pin_ready`, `synthetic_export_enabled` und
   `machine_credential_ready` nach dem Einmal-Read wieder auf `false` und
   bekräftigt alle Production-Gates als `false`.

Keine Migration enthält ein Passwort, einen Machine-Key oder eine
Connection-URL.

## Strenge Ausführungsreihenfolge

1. Authentifizierte Supabase-Secret-Oberfläche oder authentifizierten CLI-Pfad
   herstellen.
2. Zufälliges Reader-Passwort und einen separaten 256-Bit-Machine-Key nur im
   flüchtigen Operator-Kontext erzeugen.
3. Reader-Passwort direkt auf `mahleos_feedback_reader` setzen.
4. Edge Secrets setzen:
   - `MAHLEOS_FEEDBACK_INTELLIGENCE_MACHINE_KEY`
   - `MAHLEOS_FEEDBACK_READER_DATABASE_URL`
   - `MAHLEOS_FEEDBACK_INTELLIGENCE_MACHINE_GATE=SYNTHETIC_STAGING_APPROVED`
   - `MAHLEOS_FEEDBACK_INTELLIGENCE_PRODUCTION_GATE=false`
   - Previous-Key bleibt leer beziehungsweise nicht gesetzt.
5. Machine-Key ausschließlich per stdin in den fest gepinnten macOS-Keychain-
   Namespace des Consumers schreiben.
6. Producer-Open-Migration anwenden und den Gate-Zustand metadata-only prüfen.
7. Genau einen Consumer-Request ohne Retry ausführen und nur minimierte
   Validierungsmetadaten übernehmen.
8. Unmittelbar danach Edge-Machine-Key und Reader-URL entfernen, Reader-Passwort
   löschen, Edge-Machine-Gate schließen und Producer-Close-Migration anwenden.
9. Postread-Privilege-/Gate-Audit ausführen. Jede Abweichung ist `NO-GO`.

## Aktueller Fortsetzungspunkt

Der nächste zulässige externe Schritt beginnt erst nach einer erfolgreichen
Supabase-Anmeldung. Es ist kein technischer Fehler im Gateway und keine neue
Produktentscheidung offen; ausschließlich der sichere Credential-Kanal fehlt.
