# Proposed Architecture Contract

Status: `PROPOSED`, aus Code bestaetigt.

- Vite/React/TypeScript ist der Frontend-Kern.
- Supabase Auth/Postgres/RLS/RPC/Edge Functions ist der Backend-Kern.
- Content bleibt deterministisch und versioniert im Repository.
- DB speichert Zuweisung, Bearbeitung, Fortschritt und Evidence.
- Daily Final Save bleibt atomar und idempotent.
- Rollen- und Privacy-Grenzen werden serverseitig erzwungen.
- GitHub ist Code-Source-of-Truth; Hosting und DB-Live-Stand werden separat verifiziert.
- PWA und Capacitor teilen denselben Build, native Funktionen bleiben explizite Tracks.

