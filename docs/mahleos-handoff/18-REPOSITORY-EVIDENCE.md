# Repository Evidence

## Erfasster Stand

- Repository: `/Users/NeuroRewiremahle/10_Work/Social Media (1)/RewirePerform/RewirePerform`
- Branch bei Extraktion: `agent/nlz-pilot-readiness`
- Status: ein Commit vor `origin/agent/nlz-pilot-readiness`, vor dem Pack keine uncommitted Dateien.
- Head vor Pack: `ccf2b61 fix(connection-status-a11y): complete controlled pilot`.

## Primaere Belege

| Beleg | Aussage |
|---|---|
| `package.json` | React/Vite/TS/Supabase/Capacitor, Scripts und Dependencies |
| `src/App.tsx` | Routen und Oberflaechen |
| `src/contexts/AuthContext.tsx` | Session, Rolle, Testflag, lokaler Rollen-Cache |
| `src/pages/Auth.tsx` | Solo-/Team-/Coach-Onboarding und Rollenrouting |
| `src/lib/dayAssignment.ts` | deterministische Tageszuweisung aus TS-Content |
| `src/lib/dailyTracking.ts` | atomarer Tracking-Orchestrator |
| Migration `20260710120000...` | Program Runs und `save_daily_tracking_v2` |
| Migration `20260710130000...` | NLZ Readiness, Dossier, run-spezifische Aggregate |
| `src/test/privacyBoundaries.test.ts` | statische Privacy-/Atomizitaetsgrenzen |
| `src/components/admin/NlzPilotReadiness.tsx` | operative Pilotverwaltung |
| `src/components/coach/TeamMentalState.tsx` | Coach-Teamzustand |
| `src/content/playerDays.ts` | umfangreiche kanonische Tagesinhalte |
| `docs/CONTENT_LANGUAGE_STANDARD.md` | neuer Athleten-Sprachstandard |
| `src/sw.ts`, `registerSW.ts`, `vercel.json` | PWA-/Cache-Strategie |
| `capacitor.config.ts`, `ios/` | iOS-Shell |
| `docs/NLZ_FINAL_READINESS_REPORT.md` | juengster Staging-/Pilot-Testbericht |

## Tabellen und fachliche Speicher

Belegt sind unter anderem: Profile, Rollen, Teams, Mitglieder, Fragebogenantworten, Assessments, Development Index, Program Settings, Program Instances, Program Runs, Tageszuweisungen, Check-ins, Completion, Verstaendnis-Checks, Journale, Kalender, Training, Push-Subscriptions, Notification-Logs, Study Cohorts/Participants/Windows/Snapshots, Evidence Definitions/Snapshots und Incident-Logs.

## Edge Functions

- `team-mental-state`
- `send-daily-reminder`
- `send-program-start-notification`
- `get-vapid-public-key`
- `qa-create-cohort`
- `qa-set-time`
- deprecated `analyze-questionnaire` und `generate-transformation-summary`

## Testevidenz

Vorhandene Tests decken unter anderem Fragebogen-Completion, Personalisierung, Tageskontext, Daily Tracking, Privacy-Grenzen, Trackingmetriken, Verstaendnis-Checks und Connection Status ab. Der juengste Readiness-Bericht meldet 37/37 Tests und 21/21 Staging-E2E-Checks; dies ist ein dokumentierter Bericht, kein in dieser Extraktion erneut ausgefuehrter externer Test.

## Nicht aus dem Repo beweisbar

- welcher Commit aktuell live ist.
- welche Vercel-Env-Variablen live gesetzt sind.
- welche Migrationen Production wirklich enthaelt.
- DNS-, App Store Connect-, Apple Signing- und TestFlight-Status.
- reale Support-, Loesch- und Rechtsprozesse.

