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

Mahle hat diesen Read am 11. August 2026 für seine bestehenden Testteams
freigegeben. Der Scope ist exakt auf `public.teams.id/created_by` und die damit
geprüften `public.user_roles.user_id/role` begrenzt. Andere Anwendungswerte sind
weder freigegeben noch erforderlich.

## Rollback-Operator

Der bytegepinnte Generator
`scripts/generate-v1-1-production-rollback-dry-run.mjs` löst die
Transaktionsgrenze deterministisch: Er prüft vor der Ausgabe jede Migration
gegen ihren SHA-256-Pin und entfernt ausschließlich die jeweils genau einmal
vorhandenen, alleinstehenden äußeren Zeilen `BEGIN;` und `COMMIT;`. Der übrige
SQL-Inhalt bleibt grundsätzlich unverändert und wird in eine einzige äußere
Transaktion eingebettet. Zwei zusätzlich bytegenau erwartete, ausschließlich
Production-spezifische Anpassungen bilden den realen Hosted-Supabase-Vertrag
ab: Die historische Staging-Anweisung, die den von `supabase_admin` erzeugten
Creator-Admin-Edge des Readers entfernen will, und der entsprechende dynamische
Revoke-Block des neuen Production-Readers werden nur im Rollback-Test
ausgelassen. PostgreSQL 17 erzeugt diese Management-Edges bei einem
nicht-superuser `CREATEROLE`-Creator automatisch. Sie verleihen `postgres`
ausschließlich `ADMIN OPTION`; `INHERIT` und `SET` bleiben beide `false`.
Der Zielaudit verlangt deshalb exakt je einen solchen Edge von
`supabase_admin` für beide Reader und stoppt bei jeder weiteren, erbbaren oder
setzbaren Rollenbeziehung. Die originalen historischen Migrationsdateien und
ihre Source-SHAs werden nicht verändert. Vor dem ersten Migrationsschritt prüft
der Operator den erwarteten Production-Ausgangspunkt. Vor dem `ROLLBACK` prüft
er den geschlossenen Zielzustand und danach erneut, dass Rollen und Schemas
nicht persistiert sind.

Der öffentliche Systemkatalog `pg_roles` blendet Passwortwerte aus und wird
deshalb nicht als scheinbarer Passwortnachweis verwendet. Passwortlosigkeit
folgt im Dry-run aus dem fail-closed geprüften Nichtvorhandensein beider Rollen
vor Beginn, der bytegepinnnten Erstellung mit `PASSWORD NULL`, dem zusätzlichen
Production-`ALTER ROLE ... PASSWORD NULL` und dem Ausschluss jeder späteren
Passwortvergabe in der gepinnten Sequenz. Ein echtes Runtime-Credential bleibt
ein nachgelagerter, separat freizugebender Gate.

Der Operator autorisiert oder startet selbst keine Verbindung und keinen
Production-Lauf. Seine normale Ausgabe enthält nur Hash, Bytezahl und
Gate-Status. Die SQL-Ausgabe über `--print` darf erst nach der separaten
Freigabe des eng begrenzten Teamzeilen-Reads an den kontrollierten
Production-Dry-run übergeben werden. Sie darf niemals für einen persistenten
Apply verwendet werden.

Der erste freigegebene Dry-run-Versuch über den Beta-Endpunkt der Supabase
Management API wurde vor einem belegbaren PostgreSQL-Fehler abgebrochen. Die
lokale PostgreSQL-Reproduktion derselben gepinnten SQL-Kette und der frische
Production-Postrollback-Audit blieben grün; die genaue Transportursache konnte
wegen der damals fehlenden sanitisierten Fehlerklassifikation nicht
rückwirkend bewiesen werden. Dieser Beta-Transport darf deshalb für den
Gesamtlauf nicht wiederverwendet werden.

Ein erneuter Remote-Dry-run benötigt deshalb eine neu geprüfte
PostgreSQL-Client-Architektur mit einfacher Multi-Statement-Ausführung,
exakt einer Transaktionssitzung und einer frischen
Postrollback-Auditsitzung. Supabase CLI `2.113.0` ist dafür auch über
`db query --db-url` ungeeignet, weil dieser Pfad Multi-Statement-SQL im
Extended-Protocol als Prepared Statement ablehnt. Diese Diagnose erteilt keine
Credential- oder Production-Freigabe und autorisiert keinen zweiten Versuch.

Der lokale Ersatzoperator verwendet deshalb das in
`tools/production-rollback-dry-run/package-lock.json` isoliert und exakt
gepinnte `pg@8.23.0` direkt; die App- und historischen Feedback-Pakete bleiben
bytegleich. Ein frischer Checkout installiert diese isolierte Abhängigkeit
deterministisch mit
`npm ci --ignore-scripts --prefix tools/production-rollback-dry-run`; der
Operator stoppt fail-closed, wenn Lock, Paket oder installierte Version
abweichen. Ein parameterloser Query-String erzwingt das PostgreSQL
Simple Query Protocol und überträgt die bereits bytegepinnte äußere
`BEGIN ... ROLLBACK`-Transaktion als genau einen Query-Aufruf. Das Ziel ist
fest auf den Production-Session-Pooler Port `5432` begrenzt. TLS prüft die
Zertifikatskette und den Zielhost. Der Child-Prozess erhält ausschließlich die
festen Werte `LANG=C`, `LC_ALL=C`, `TZ=UTC`; insbesondere werden keine
geerbten `NODE_*`-, `PG*`-, TLS-/Keylog-, Proxy-, CA-, Loader-, Debug- oder
Passwort-Umgebungsvariablen weitergegeben. Ein
separat und nur temporär freigegebenes Passwort darf ausschließlich als
einmalige stdin-Nachricht in diesen Child-Prozess gelangen, nie in URL,
Argumente, Datei oder Evidenzausgabe. Der Child-Prozess muss seine Session
nachweislich schließen, bevor eine zweite, frische Postrollback-Auditsitzung
beginnt. Timeout beendet den direkten Child-Prozess mit `SIGKILL`; durch den
Socket-Abbruch rollt PostgreSQL eine gegebenenfalls offene Transaktion zurück.
Kein Retry ist zulässig. Auch dieser lokal getestete Operator autorisiert
weiterhin weder ein Credential noch einen zweiten Production-Lauf.

## Geschlossene Grenzen

Dieser Plan erzeugt oder autorisiert keine Credentials, keinen Edge-Deploy,
keinen Jarvis-Read, keine Feedback-Collection und keine Minderjährigen-
Verarbeitung. Die Reader-Rollen bleiben ohne Passwort und sämtliche Runtime-,
Privacy-, App-Store-, Guardian-, Minor- und Real-Data-Gates bleiben geschlossen.

Die maschinenlesbare Reihenfolge und alle SHA-256-Pins liegen unter
`docs/feedback-intelligence/contracts/production-migration-plan-v0.1/`.
