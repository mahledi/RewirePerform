# Proposed Database Guardrails

Status: `PROPOSED`, Code/Docs bestaetigt.

- Schema nur ueber versionierte Forward-Fix-Migrationen.
- vor produktivem Apply: Backup-/Rollback-Gedanke, Dry Run, RLS- und Rollenpruefung.
- keine manuelle Korrektur echter Daten ohne dokumentierten Scope.
- Program Runs und Instanzen nicht vermischen.
- atomare/idempotente Writes fuer kritische Tagesdaten.
- Supabase-Typen nach Schemaaenderung aktualisieren.
- Mahles Freigabe vor jeder produktiven Datenbankaktion.

