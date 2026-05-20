# Weg zur vollen Unabhängigkeit

Ziel: RewirePerform läuft komplett ohne Lovable — eigenes Hosting (Web + iOS App Store), eigene Backend-Kontrolle, eigene CI/CD. Lovable bleibt optional als Dev-Tool.

## Aktueller Stand (gut!)

- Code auf GitHub synchronisiert (Single Source of Truth)
- Vite-Build → standard `dist/` Output → läuft überall
- Supabase ist Standard-Postgres + Auth, kein Lovable-Lock-in
- Capacitor iOS-Shell bereits eingerichtet (`ios/`)
- `docs/PORTABILITY.md` + `docs/DEPLOYMENT.md` existieren bereits
- Env-Validierung (`npm run validate:env`) vorhanden

**Du bist schon zu ~80% unabhängig.** Es fehlt nur die Aktivierung.

## Die 4 Schritte zur Unabhängigkeit

### Schritt 1: Eigenes Web-Hosting (1–2 Stunden)
- Vercel/Netlify/Cloudflare Pages mit GitHub-Repo verbinden
- Build-Settings: `npm ci` / `npm run build` / Output `dist`
- Env-Variablen setzen: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- Custom Domain `rewireperform.com` verbinden
- Supabase Auth → Redirect-URLs um neue Domain ergänzen

### Schritt 2: Supabase aus Lovable Cloud "befreien" (kritisch)
Aktuell läuft die DB als **Lovable Cloud Managed Supabase** (`twceqincrbrenyuqukpj`). Optionen:

- **Option A (empfohlen, einfach):** DB **behalten wie sie ist**. Lovable Cloud bleibt der Hoster, du nutzt sie direkt über Supabase API. Funktioniert auch ohne Lovable Editor. Risiko: Lovable könnte irgendwann den Zugriff ändern.
- **Option B (volle Souveränität):** Migration zu eigenem Supabase-Account. Schema via `supabase db dump` exportieren, neues Projekt anlegen, Daten + Users migrieren, Edge Functions deployen, Frontend-Env umstellen. Aufwand: 1 Tag, einmal sauber dokumentiert.

### Schritt 3: iOS App Store (Capacitor, schon vorbereitet)
- Apple Developer Account ($99/Jahr)
- `npm run app:build` → `npx cap sync ios` → Xcode öffnen
- App Icons + Splash bereits in `ios/App/App/Assets.xcassets/`
- App Store Connect: Eintrag erstellen → TestFlight → Review → Live
- Anleitung steht teilweise in `docs/APP_STORE.md`

### Schritt 4: CI/CD ohne Lovable
- GitHub Actions (`.github/workflows/ci.yml` existiert bereits)
- Erweitern um: Auto-Deploy zu Vercel + Supabase Edge Functions bei Push auf `main`
- Damit ist Lovable nur noch ein optionaler Editor

## Was diese Plan-Iteration jetzt liefert

Ich schlage vor, **jetzt nur Schritt 1 + 4 vorzubereiten** (Web-Deploy + CI), weil das dich sofort unabhängig macht ohne DB-Migrations-Risiko. Schritt 2 (DB-Souveränität) und Schritt 3 (App Store) machen wir separat, wenn du bereit bist.

Konkret in diesem Loop:
1. `docs/INDEPENDENCE.md` schreiben — eine klare Schritt-für-Schritt-Anleitung (Web-Deploy, DB-Migration, App Store, CI/CD), die du auch in einem Jahr noch verstehst, ohne mich zu fragen.
2. `.github/workflows/deploy.yml` ergänzen — Auto-Deploy-Skeleton für Vercel + Supabase Functions (auskommentiert, du aktivierst es wenn du den Hoster gewählt hast).
3. `scripts/export-supabase-schema.sh` — One-Click-Skript für DB-Dump (für spätere Migration).

Kein Refactoring, keine Code-Änderungen am App-Verhalten. Nur Doku + Tooling für Unabhängigkeit.

## Technische Details

- Keine neuen Runtime-Dependencies
- Keine DB-Migrationen
- Keine Änderungen an `src/`, Supabase-Schema oder Edge Functions
- Lovable-spezifisches (`lovable-tagger`, `.lovable/`) bleibt — stört Standalone-Betrieb nicht
