# Source-of-Truth-Karte

| Thema | Source of Truth | Vertrauen |
|---|---|---|
| Produktvision | dieses Pack + Mahles aktuelle Bestaetigung | mittel bis hoch |
| aktuelle Prioritaet | aktiver Branch plus Mahles neueste Aussage | `MISSING_SOURCE_OF_TRUTH` bis Reihenfolge bestaetigt |
| Frontendarchitektur | `package.json`, `src/App.tsx`, `src/` | hoch |
| Datenmodell | neueste Migrationen in `supabase/migrations` | hoch fuer Sollzustand, live separat pruefen |
| generierte DB-Typen | `src/integrations/supabase/types.ts` | hoch, falls nach letzter Migration regeneriert |
| Auth | `AuthContext.tsx`, `Auth.tsx`, RLS/Trigger-Migrationen | hoch |
| Rollen und Privacy | neueste RLS/RPC-Migrationen, Privacy-Tests, `NLZ_PRIVACY_AUDIT.md` | hoch fuer Code |
| Daily Tracking | `dailyTracking.ts`, `DailyCheckin.tsx`, `save_daily_tracking_v2` | hoch |
| 56-Tage-Content | `src/content/playerDays.ts` mit Aufloesung ueber `dailyContent.ts`/Domain Logic | hoch, genaue Kanonizitaet vor Edit pruefen |
| Sprachregeln | `docs/CONTENT_LANGUAGE_STANDARD.md` + Mahles Chatentscheidungen | hoch |
| Coach-Zustand | `TeamMentalState.tsx`, `TeamOverview.tsx`, Edge Function | hoch |
| Evidence/NLZ | Migrationen vom 27.06. und 10.07., Readiness-Komponente und juengste NLZ-Dokumente | hoch fuer Code/Staging-Bericht |
| Tests | `src/test`, `npm run ci`, CI Workflow | hoch fuer lokal; CI-Env konfliktbehaftet |
| Deployment | `vercel.json`, Hosting-Dashboard, `docs/DEPLOYMENT.md` | mittel; externer Live-Stand separat |
| Supabase-Projekt | `supabase/config.toml` fuer Link, Hosting-Env fuer Runtime | `CONFLICT` mit CI/alten Docs |
| App Store | `capacitor.config.ts`, `ios/`, `docs/APP_STORE.md` | mittel; Apple Connect extern |
| Production-Daten | Supabase-Dashboard/CLI des echten Projekts | `MISSING_SOURCE_OF_TRUTH` im Repo |
| Domain/DNS | Vercel + DNS-Provider live | `MISSING_SOURCE_OF_TRUTH` im Repo |
| wissenschaftliche Endfreigabe | Mahle + qualifizierte Fachpruefung | ausserhalb Code |

Regel: Repository belegt Implementierung, nicht automatisch Deployment. Dokumentation belegt Absicht oder Testbericht, nicht automatisch aktuellen externen Zustand.
