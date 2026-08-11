# RewirePerform 1.1 – Production-Migrationsplan

Status: lokal vorbereitet; alle externen Gates geschlossen

## Belegter Ausgangspunkt

- Production-Projekt: `bqsbxesmybthwtxmowfz` (Deutschland).
- Letzte remote angewendete Migration im Metadaten-Audit vom 11. August 2026:
  `20260801104717`.
- Production-Feedback-Reader, Production-RPC und Production-Edge-Function sind
  nicht vorhanden.
- Der Audit las ausschließlich Katalog- und Konfigurationsmetadaten, keine
  Anwendungs-, Feedback- oder Minderjährigendaten.

## Verbindliche Sequenz

Der Plan pinnt alle 25 lokalen Migrationen nach dem remote Stand bytegenau.
24 davon sind in exakter Reihenfolge anzuwenden. Die Migration
`20260808074346_feedback_intelligence_synthetic_staging_read_gate_v0_1.sql`
darf in Production niemals ausgeführt werden, weil sie ausschließlich für den
damaligen synthetischen Staging-Zyklus Datenbank-Gates öffnet. Ihre Version wird
im kontrollierten Production-Cutover nur als angewendet markiert, ohne ihre
SQL-Bytes auszuführen. Die direkt folgende Close- und Remediation-Kette wird
normal angewendet.

Ein pauschales `supabase db push` ist verboten. Vor einem persistenten Apply
sind erforderlich:

1. unabhängige Abnahme des gepinnten Plans;
2. ein vollständiger Production-Preflight ohne Anwendungsdatenread;
3. eine transaktionale Ausführung derselben Apply-Migrationen mit abschließendem
   `ROLLBACK` und einem fail-closed Zielzustandsaudit;
4. ein aktueller Backup-/Wiederherstellungsnachweis;
5. eine separate Freigabe für den persistenten Apply.

## Geschlossene Grenzen

Dieser Plan erzeugt oder autorisiert keine Credentials, keinen Edge-Deploy,
keinen Jarvis-Read, keine Feedback-Collection und keine Minderjährigen-
Verarbeitung. Die Reader-Rollen bleiben ohne Passwort und sämtliche Runtime-,
Privacy-, App-Store-, Guardian-, Minor- und Real-Data-Gates bleiben geschlossen.

Die maschinenlesbare Reihenfolge und alle SHA-256-Pins liegen unter
`docs/feedback-intelligence/contracts/production-migration-plan-v0.1/`.
