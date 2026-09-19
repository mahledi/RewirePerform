# Review – Jarvis Deep Analysis Bridge V2

## Ziel

Mahle kann unter einer normalen, kostenlosen „Frag Jarvis“-Antwort bewusst eine
strukturierte Codex-Tiefenanalyse anfordern. Die Website startet keinen lokalen
Prozess direkt und erhaelt niemals einen Machine- oder Service-Key.

## Ergebnis

- `/admin/jarvis` erzeugt nur Frage, Snapshot-Hash und Quellenstatus.
- Eine private, deduplizierte Queue ist als Supabase-Vertrag vorbereitet.
- Nur ein serverseitig bestaetigter Admin darf anfordern und lesen.
- Der getrennte Machine-Endpunkt darf ausschliesslich claimen und abschliessen;
  er besitzt keinen Tabellenpfad.
- Der Admin pollt den Status und zeigt fertige Ergebnisse in einfachem Deutsch
  nach Entwicklung, Vergleich, Datenqualitaet, Zusammenhaengen, Pruefbereichen,
  Founder-Fragen, Quellen und Grenzen.
- Freitext, Journale, Namen, E-Mails, direkte IDs, Einzelprofile, Diagnosen,
  Kausal- und automatische Produktentscheidungen bleiben ausgeschlossen.

## Geaenderte Dateien

- `src/lib/adminJarvisDeepAnalysis.ts`
- `src/pages/AdminJarvis.tsx`
- `supabase/contracts/jarvis_deep_analysis_bridge_v1.sql`
- `supabase/functions/jarvis-deep-analysis-worker/index.ts`
- `supabase/config.toml`
- zugehoerige Contract-, Gateway- und Privacy-Tests

## Tests und Checks

- fokussiert: `21/21` Tests gruen;
- `npm run typecheck`: gruen;
- Produktions-Build: gruen;
- vollstaendiges `npm run ci`: gruen;
- Vitest innerhalb CI: `229/229` Dateien, `1216/1216` Tests;
- alle in CI enthaltenen SQL-, RLS-, Feedback-, Minor-, Privacy-, Tracking-,
  Evidence- und App-Store-Readiness-Gates: gruen;
- `git diff --check`: gruen.

## Offene Risiken

- Die SQL-Datei ist ein vorbereiteter Vertrag, keine Migration. Supabase CLI
  war lokal nicht vorhanden; eine Migrationsnummer wurde deshalb nicht erfunden.
- Keine Production-Migration und kein Edge-Deploy wurden ausgefuehrt.
- Der lokale Worker ist noch nicht aktiviert; die UI-Funktion ist daher nicht
  `ACTIVE` oder `LIVE_PROVEN`.
- Die Bruecke ist R4 wegen Adminrolle, RLS und Production-Daten. Vor Aktivierung
  sind separate Migration-, Deploy- und Live-Smoke-Gates erforderlich.

## Empfohlener naechster Schritt

Nach kontrollierter Integration die echte Migration mit der Supabase CLI
erzeugen, unveraendert gegen diesen Vertrag pruefen und erst mit separater
Production-Freigabe deployen. Danach Worker lokal aktivieren und eine
synthetische Doppelanfrage als Ein-Aufruf-/Reuse-Beweis ausfuehren.

## Risikostufe

R4 vorbereitet und lokal getestet; keine R4-Aktion ausgefuehrt.
