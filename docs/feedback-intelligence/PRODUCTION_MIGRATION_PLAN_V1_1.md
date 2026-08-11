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

Der vollständige Rollback-Dry-run ist nicht rein metadata-only: Die
Coach-/Enterprise-Migration liest die bestehenden Teamzeilen und erzeugt die
daraus abgeleiteten `team_staff_memberships` innerhalb der anschließend
zurückgerollten Transaktion. Es werden keine Feldwerte als Evidence
persistiert oder ausgegeben. Trotzdem beginnt dieser Test erst nach einer
separaten Freigabe für genau diesen Production-Datenzugriff.

## Rollback-Operator

Der bytegepinnte Generator
`scripts/generate-v1-1-production-rollback-dry-run.mjs` löst die
Transaktionsgrenze deterministisch: Er prüft vor der Ausgabe jede Migration
gegen ihren SHA-256-Pin und entfernt ausschließlich die jeweils genau einmal
vorhandenen, alleinstehenden äußeren Zeilen `BEGIN;` und `COMMIT;`. Der übrige
SQL-Inhalt bleibt unverändert und wird in eine einzige äußere Transaktion
eingebettet. Vor dem ersten Migrationsschritt prüft der Operator den erwarteten
Production-Ausgangspunkt. Vor dem `ROLLBACK` prüft er den geschlossenen
Zielzustand und danach erneut, dass Rollen und Schemas nicht persistiert sind.

Der Operator autorisiert oder startet selbst keine Verbindung und keinen
Production-Lauf. Seine normale Ausgabe enthält nur Hash, Bytezahl und
Gate-Status. Die SQL-Ausgabe über `--print` darf erst nach der separaten
Freigabe des eng begrenzten Teamzeilen-Reads an den kontrollierten
Production-Dry-run übergeben werden. Sie darf niemals für einen persistenten
Apply verwendet werden.

## Geschlossene Grenzen

Dieser Plan erzeugt oder autorisiert keine Credentials, keinen Edge-Deploy,
keinen Jarvis-Read, keine Feedback-Collection und keine Minderjährigen-
Verarbeitung. Die Reader-Rollen bleiben ohne Passwort und sämtliche Runtime-,
Privacy-, App-Store-, Guardian-, Minor- und Real-Data-Gates bleiben geschlossen.

Die maschinenlesbare Reihenfolge und alle SHA-256-Pins liegen unter
`docs/feedback-intelligence/contracts/production-migration-plan-v0.1/`.
