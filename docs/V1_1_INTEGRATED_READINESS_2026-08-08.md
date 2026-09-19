# RewirePerform V1.1 – lokaler Integrations- und Readiness-Stand

Stand: 8. August 2026

## Entscheidung

Der kombinierte V1.1-Kandidat ist lokal bis unmittelbar vor dem physischen iPhone-/iPad-Test vorbereitet. Dieser Stand ist keine Freigabe für Push, Merge, Staging, Production, TestFlight oder App-Store-Einreichung.

## Integrierte Quellen

- Ausgangsbasis `origin/main`: `2535ade4ee021dffa19eb5c3bacd4144edeb7430`
- Coach-/Enterprise-Onboarding: `038464ae59afd4a20a2c10750087245da9a912cb`
- Feedback Intelligence: `1c348537cc719b97a55442d4ea2b593f487770e4`
- Content und Rest-Day-Visualisierung: `47519c273f30e73781b827645c726be8e9713db4`
- Lokale Integrations-Merges: `2c22524` und `74c52c1`

## Sichtbarer V1.1-Umfang

- Der echte 56-Tage-Content läuft über den produktiven Daily-Flow-Pfad.
- Der Ruhetag führt nach zwei Minuten ruhiger Atmung durch drei klar geführte Visualisierungsschritte und danach direkt zurück zum Dashboard.
- Nach der Visualisierung erscheint keine zusätzliche Verständnisfrage; das Journal bleibt zeitlich getrennt.
- Feedback Intelligence enthält zur Ruhetag-Visualisierung jeweils zwei progressive Fragen an Tag 10, 24, 39 und 55. Diese Fragen liegen in den vorgesehenen Feedbackfenstern, nicht direkt nach jeder Visualisierung.
- Coach-/Enterprise-Onboarding, Organisationsanfragen, Rollen und Co-Coach-Struktur sind lokal integriert; externe Aktivierung bleibt geschlossen.

## Verifikation

- Vollständige lokale CI: 123 Testdateien, 703 Tests, grün.
- TypeScript, Produktions-Web-Build und sämtliche vorhandenen SQL-, Privacy-, Minor-, Guardian-, Access-, Deletion-, Feedback- und App-Store-Static-Gates: grün.
- Produktionsziel verifiziert: `bqsbxesmybthwtxmowfz`.
- Capacitor-iOS-Synchronisierung und eingebettetes iOS-Produktionsziel: grün.
- `npm audit --omit=dev`: 0 Befunde.
- React Router auf 7.18.2 und PostCSS auf 8.5.26 aktualisiert; Redirect-Regressionen bleiben abgedeckt.
- Reine Entwicklungswerkzeuge: ein hoher und ein moderater Befund im Vite-5/esbuild-Pfad. Die angebotene Behebung verlangt den Major-Sprung auf Vite 8 und wird nicht unmittelbar vor dem physischen Gerätetest ungeprüft erzwungen. Diese Werkzeuge werden nicht in die veröffentlichte App eingebettet.

## Bewusst geschlossene externe Gates

- kein Push oder Merge nach `main`
- keine Staging- oder Production-Migration
- keine Aktivierung der Feedback-/Jarvis-Machine-Reads
- keine echten Jarvis-Reads
- kein TestFlight-Build und keine App-Store-Aktion
- keine physische Geräteinstallation in diesem Stand

## Offene Gates vor V1.1-Release

1. Einen späteren sauberen Feedback-Handoff gegen diesen eingefrorenen Stand abgleichen; uncommittete Parallel-Arbeit wird nicht übernommen.
2. Den exakten Integrations-Commit auf iPhone und iPad installieren und die sichtbaren V1.1-Flows vollständig prüfen.
3. Staging-RLS, Edge Functions und draft-only Migrationen kontrolliert verifizieren.
4. Minderjährigen-, Privacy- und rechtliche Release-Grenzen final bestätigen.
5. Nach separater Freigabe Push/PR/Merge, Production-Aktivierung, TestFlight und erneute App-Store-Einreichung durchführen.
