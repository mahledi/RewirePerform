# Feedback Intelligence – Postdeploy Assurance 2026-08-08

Producer-Auswertung: `PASS_POSTDEPLOY_ASSURANCE`.

- Reader gehärtet: kein Superuser, kein `BYPASSRLS`, kein `INHERIT`.
- Genau ein aufrufbarer Function-Pfad: der exakte Gateway-RPC.
- Keine direkten Tabellen-, View-, Materialized-View- oder Sequence-Rechte.
- Nur `USAGE` auf `public`; keine Nutzung der vier privaten Feedback-Schemas.
- `anon`, `authenticated` und `service_role` können den Gateway-RPC nicht
  aufrufen.
- Der einzige Hosted-Management-Eintrag hat `INHERIT=false` und `SET=false`
  und vermittelt deshalb keine Reader-Rechte.
- Die bekannte Admin-Aggregat-Ausnahme bleibt vollständig definitions- und
  metadatengepinnt.

Der Edge-Code ist in Staging bereitgestellt, aber ohne Machine-Key,
Reader-Datenbank-Credential und geöffnetes Runtime-Gate weiterhin fail-closed.
Production, Echtdaten und Schreibzugriffe bleiben geschlossen.
