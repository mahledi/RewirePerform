# Known Failure Modes

- Safari/PWA stale HTML und Chunks: bestehende minimale SW-/Cache-Strategie respektieren; Deploy-Reload auf iOS pruefen.
- doppelte Reload-Mechanismen: keine ueberlappenden SW-Workarounds stapeln.
- Frage-/Assessment-Index ausserhalb Array: Zugriff guarden und Navigation pro Schritt validieren.
- Pflichtantwort erst am Ende erkannt: `Weiter` direkt blockieren.
- richtige Verstaendnisantwort immer oben: stabile Randomisierung testen.
- Completion ohne Check-in: atomaren RPC verwenden; Snapshot erst nach Erfolg.
- doppelte Tagesdaten: idempotente Identitaet und DB-Constraints erhalten.
- Coach-Privacy nur in UI: immer RLS/RPC und echte Rollen pruefen.
- Run-/Kohortenvermischung: strikt nach `program_run_id` und Instanz scopen.
- QA in Production-Evidence: Testflags standardmaessig ausschliessen.
- Voice-Text beim Stoppen verloren: Interimstext sofort erhalten.
- mobile Flow-Mitte statt Anfang: Schrittwechsel ohne sichtbare Animation nach oben setzen.
- Save ohne Feedback: Press-/Loading-Zustand sofort anzeigen.
- abstrakte Kurztexte: Science Bite nicht in Fachbegriffe komprimieren; Sprachstandard anwenden.
- falsches Backend durch Env/Fallback: Projekt-ID und Env explizit validieren.
- Agent behauptet Live-Zustand aus Git: externe Systeme read-only verifizieren oder Unsicherheit nennen.
- Agent erweitert Scope: Diff begrenzen, fremde Aenderungen bewahren, Stop Conditions anwenden.

