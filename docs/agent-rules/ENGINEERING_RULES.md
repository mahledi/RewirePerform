# Engineering Rules

Quelle: aktive `RP-EN-*` und aktueller Aktivierungsauftrag.

- Nicht direkt auf `main` arbeiten.
- Vor Aenderungen Codepfad, Datenfluss, Tests, Git-Status und bestehende Muster lesen.
- Fragen/Reviews autorisieren keine Mutation; explizite Implementierung wird lokal vollstaendig verifiziert.
- Scope eng halten; keine unnötigen Refactorings, Abhaengigkeiten oder Nebenbaustellen.
- fremde Aenderungen bewahren; keine destruktiven Git-Befehle.
- GitHub ist Code-Source-of-Truth; externer Live-Stand wird separat verifiziert.
- Schema nur per versionierter Migration, aber kein Apply ohne Freigabe.
- Runtime-Env explizit; kein stiller Production-Supabase-Fallback.
- RLS-/Privacy-Schutz serverseitig, nicht nur in UI.
- kritische Writes atomar/idempotent; Logging darf Nutzerflows nicht brechen.
- keine privaten Inhalte in Monitoring, Events, Exporte oder Prompts.
- PWA darf keine stale HTML-/Chunk-Kombination erzeugen; bestehende Cache-Strategie nicht ungeprueft erweitern.
- vor Abschluss mindestens Typecheck, Tests, Build und `git diff --check` soweit taskrelevant; UI mobil/desktop smoke-testen.
- kein Push, Merge, Deploy, Domain-, Store-, Secret- oder Production-Schritt ohne Mahles Freigabe.
- Ergebnisse auf Deutsch mit Tests, Risiken und offenen Punkten melden.

