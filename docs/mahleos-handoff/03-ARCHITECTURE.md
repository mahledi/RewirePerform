# Architektur

## Karte

```text
Athlet / Coach / Admin
  -> React Router + rollenbezogene Pages
  -> UI-Komponenten, Hooks und lokale Drafts
  -> Domain Logic in src/lib und Content in src/content
  -> Supabase JS Client
  -> Auth / PostgREST / RPC / Edge Functions
  -> Postgres mit RLS und versionierten Migrationen
  -> privacy-spezifische Spieler-, Coach- und Adminansichten
```

## Repository-Aufbau

- `src/pages`: routebezogene Oberflaechen.
- `src/components`: Shared UI sowie `coach`, `admin`, `daily`, `dashboard`, `questionnaire`, `settings`.
- `src/content`: 56-Tage-Inhalte, Science Bites, Matrix-Typen und Content-Aufloesung.
- `src/lib`: Tageszuweisung, Tracking, Progress, Monitoring, Consent, Programminstanzen und PWA-Registrierung.
- `src/integrations/supabase`: typisierter Client und generierte DB-Typen.
- `supabase/migrations`: Datenmodell, RLS, RPCs und Tracking-/Evidence-Evolution.
- `supabase/functions`: Teamzustand, Push, QA und deprecated AI-Stubs.
- `src/test`: Vitest-/Testing-Library-Tests fuer Tracking, Privacy, Fragebogen, Personalisierung und Verbindung.
- `ios`: Capacitor-iOS-Projekt.
- `docs`: Runbooks, Privacy-, Evidence-, Deployment- und App-Store-Dokumentation.

## Datenfluss Daily Flow

```text
Programmstart / Program Run
  -> getEffectiveProgramStart
  -> ensureAssignment(user, date, context)
  -> resolveDay(day number, calendar context)
  -> Spieler bearbeitet Check-in + Aufgaben + Verstaendnis
  -> save_daily_tracking_v2 (atomar, idempotent)
  -> Progress Snapshot
  -> Coach: nur operative Einzelstatus + geschuetzte Aggregate
  -> Admin: Datenqualitaet, Readiness und consentierte Evidence
```

## Kritische Komponenten

- `AuthContext.tsx`, `ProtectedRoute.tsx`, `Auth.tsx`: Session und Rollenrouting.
- `dailyTracking.ts` und `save_daily_tracking_v2`: Datenintegritaet beim Tagesabschluss.
- RLS/Helper-Funktionen in Migrationen: Zugriffstrennung.
- `team-mental-state`: sensible Teamaggregate.
- `get_nlz_pilot_readiness` und `get_nlz_evidence_dossier`: Pilot- und Evidence-Grenzen.
- `playerDays.ts`, `dailyContent.ts`, `matrixDays.ts`: fachliche Tagesmechanik und Sprache.
- Service Worker und Push-Funktionen: Homescreen-/Notification-Verhalten.

## Zustand und Schnittstellen

- Serverzustand wird direkt ueber Supabase und punktuell React Query geladen.
- Authzustand liegt in `AuthContext`; Rollen werden fuer schnelle Ruecknavigation lokal gecacht und serverseitig nachgeladen.
- Lokale Drafts und Pending Consent sind Best-Effort-UX, nicht Source of Truth fuer Evidence.
- Content ist deterministisch im Repository; DB speichert Zuweisung und Bearbeitung.

## Build und Tests

```bash
npm ci
npm run validate:env
npm run typecheck
npm run build
npm test
npm run lint
npm run app:build
```

`npm run ci` umfasst Env-Template, Typecheck, Build und Tests. Lint ist laut README noch nicht allgemeines Release-Gate, obwohl der juengste NLZ-Bericht 0 Fehler und 16 Hinweise nennt.

## Blast-Radius-Zonen

- R4: Auth, RLS, Rollen, Migrationen, Consent, Coach-Sichtbarkeit, Exporte, Account-Loeschung.
- R3: Daily Tracking, Program Runs, Assessments, Push, Service Worker, Capacitor.
- R2: isolierte UI-/Copy-Aenderungen mit vorhandenem Testpfad.
- R1: Dokumentation und read-only Analyse.

