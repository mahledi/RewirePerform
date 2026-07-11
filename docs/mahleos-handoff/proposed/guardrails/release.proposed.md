# Proposed Release Guardrails

Status: `PROPOSED`, Code/Docs/Chat bestaetigt.

Vor Merge/Deploy: Env-Validierung, Typecheck, Tests, Build, Diff-Check, relevante Rollen-/Mobile-Smokes. Bei DB: Dry Run, RLS-JWT-Tests, Backup-/Rollback-Plan. Bei App Store: echtes Geraet, Auth/Session/Reload, Privacy/Support, Labels und Demo-Accounts.

Kein Merge, Push, Production-Deploy, Domain-Cutover, Migration oder Store-Submission ohne Mahles ausdrueckliche Freigabe. P0 bei Auth-Ausfall, Datenverlust, falscher Rolle oder Privacy-Verletzung; sofort pausieren/rollbacken.

