# Stabilisierung & Unabhängigkeit: "Production-Grade" Plan

Ziel: Das System so absichern, dass es **ohne Lovable** läuft, **ohne Regressionen** bleibt und **professionell deploybar** ist. Keine neuen Features — nur Härtung, Tests, Observability, Dokumentation.

## Was bleibt unverändert
- Produktlogik (56-Tage-Programm, Coach, aMCC, Tasks, Check-in)
- UI/UX
- Supabase-Schema

## Arbeitspakete

### 1. Lint-Schulden tilgen (Blocker für CI-Gate)
- `any` raus, Hook-Deps korrekt, ungenutzte Imports löschen
- `npm run lint` in CI-Pipeline als **Pflicht-Gate** aufnehmen
- ESLint-Regeln nicht aufweichen — Code anpassen

### 2. Test-Layer ausbauen
Aktuell nur 1 Beispiel-Test. Ziel: **Smoke + kritische Pfade**.
- Unit-Tests für `lib/`: `deterministicQuestionnaireAnalysis`, `deterministicProgressSummary`, `dayAssignment`, `getCurrentProgramDay`, `flameStats`, `programProgress`, `questionScoring`
- Component-Tests (Vitest + Testing Library) für: `DailyCheckin`, `QuestionnaireFlow`, `ProtectedRoute`
- Playwright E2E für 3 Flows: Auth → Onboarding → Tag 1 Check-in / Coach-Team-View / Admin-QA
- Coverage-Schwelle: mind. 60% auf `src/lib/`

### 3. CI/CD verschärfen
- Lint + Typecheck + Test + Build = **alle 4 Pflicht** für Merge
- Branch-Protection auf `main` (vom Nutzer in GitHub zu aktivieren — wird dokumentiert)
- Preview-Deploys via Vercel/Netlify (Wahl: Vercel empfohlen)

### 4. Lovable-Entkopplung final
- `lovable-tagger` nur dev — verifizieren
- `scripts/rewrite-comprehension.ts` als optional markieren, aus Default-Pfad raus
- Deprecated Edge Functions (`analyze-questionnaire`, `generate-transformation-summary`) komplett löschen statt 410-Stubs
- README: "Run without Lovable" Section

### 5. Observability
- Frontend: Sentry oder simpler ErrorBoundary + Supabase-Logging-Tabelle
- Edge Functions: strukturiertes Logging (level, request_id, user_id)
- Health-Endpoint: `/api/health` (Edge Fn) für Uptime-Checks

### 6. Sicherheits-Audit
- `supabase--linter` laufen lassen, alle Findings fixen
- Manuelles RLS-Review der wichtigsten Tabellen: `daily_checkins`, `assessments`, `program_instances`, `team_members`, `user_roles`
- Security-Memory-Dokument aktualisieren

### 7. Backup & Rollback
- Dokumentierte Supabase-Backup-Strategie (täglicher PITR-Snapshot)
- Migration-Rollback-Playbook in `docs/DEPLOYMENT.md` ergänzen
- DB-Export-Skript: `scripts/export-snapshot.ts`

### 8. Dokumentation finalisieren
- `README.md`: Quickstart, Architektur-Diagramm, Tech-Stack
- `CONTRIBUTING.md`: Branch-Strategie, PR-Template, Commit-Konvention
- `docs/ARCHITECTURE.md`: Daten-Flow, Komponenten-Map
- `docs/RUNBOOK.md`: Was tun bei Outage X/Y/Z

## Reihenfolge (PR-Branches)

1. `hardening/lint-zero` — Lint-Schulden weg, CI-Gate hart
2. `hardening/test-coverage` — Unit + Component + E2E
3. `hardening/observability` — ErrorBoundary, Logging, Health
4. `hardening/security-audit` — Linter-Findings + RLS-Review
5. `hardening/lovable-decouple-final` — Stubs weg, README-Sektion
6. `hardening/docs-runbook` — README, ARCHITECTURE, RUNBOOK
7. `hardening/backup-rollback` — Snapshot-Skript, Playbook

Jeder Branch klein, einzeln mergebar, einzeln revertierbar.

## Erfolgskriterien

- `npm run ci` (lint + typecheck + test + build) grün ohne Ausnahmen
- App startet auf Vercel **ohne Lovable-Verbindung**
- E2E-Suite läuft in CI
- 0 offene Supabase-Linter-Findings
- Onboarding eines neuen Devs in <30 Min via README

## Technische Details (für später)

- Vitest + @testing-library/react für Components
- Playwright bereits installiert — Config existiert
- Sentry: `@sentry/react` + DSN als Build-Secret
- Branch-Protection: GitHub-Settings, nicht im Code
