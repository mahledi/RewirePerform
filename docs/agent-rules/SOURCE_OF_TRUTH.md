# Source of Truth

## Praezedenz

1. aktive Safety-/Privacy-Regeln und Blocking Decisions.
2. Mahles aktueller expliziter Auftrag innerhalb dieser Grenzen.
3. `AGENTS.md` und relevante aktive Dateien in diesem Ordner.
4. aktueller Code, neueste Migrationen und Tests.
5. aktuelle, verifizierte Runbooks und externe Read-only-Verifikation.
6. Knowledge Pack und historischer Chat.
7. Vermutungen.

## Technische Quellen

- Architektur/Routen: `package.json`, `src/App.tsx`, `src/`.
- Auth/Rollen: `AuthContext.tsx`, `Auth.tsx`, neueste RLS-/Trigger-Migrationen.
- Datenmodell: neueste Dateien in `supabase/migrations`; Production ist am 14. Juli 2026 bis `20260714104145_harden_internal_trigger_function_privileges` live verifiziert.
- Daily Tracking: `src/lib/dailyTracking.ts`, `DailyCheckin.tsx`, `save_daily_tracking_v2`.
- Content: `src/content/playerDays.ts` plus tatsaechliche Aufloesung in `dailyContent.ts`/Domain Logic.
- Sprache: `docs/CONTENT_LANGUAGE_STANDARD.md`.
- NLZ/Pilot: Migrationen vom 10.07., `NlzPilotReadiness.tsx`, juengster Final Readiness Report.
- Privacy: RLS/RPC, Privacy-Tests, `docs/NLZ_PRIVACY_AUDIT.md` mit dokumentierten Konflikten.
- Deployment: `vercel.json` plus Live-Dashboard; Repo allein beweist keinen Deploy.
- App Store: Capacitor/iOS plus externer Apple-Stand.

## Bekannte Quellenkonflikte

Production ist `bqsbxesmybthwtxmowfz`; das am 6. August 2026 fuer ausschliesslich synthetische Tests freigegebene getrennte Staging-Projekt ist `zbeswjipayspgvcipzmx`. Der alte Ref `towgvykgezrmkbyudjen` bleibt gesperrt. Historische Pre-Program-Run-Limits und die unmittelbare Prioritaet sind nicht still aufloesbar; sie stehen in `BLOCKING_DECISIONS.md` und `DEFERRED_RULES.md`.
