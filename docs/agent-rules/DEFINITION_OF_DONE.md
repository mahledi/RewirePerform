# Definition of Done

Ein RewirePerform-Task ist fertig, wenn:

1. Nutzerproblem, Scope, Risikostufe und Source of Truth klar sind.
2. Betroffener Datenfluss und bestehende Muster verstanden wurden.
3. Das Diff minimal, konsistent und privacy-safe ist.
4. Pflicht-, Loading-, Error-, Offline- und Retry-Zustaende beruecksichtigt sind.
5. Bei Aenderungen an betroffenen UI-Flows Mobile-Darstellung und Text-Fit soweit praktisch geprueft wurden; nicht ausgefuehrte manuelle Smokes werden transparent genannt.
6. mindestens `npm run typecheck`, `npm test`, `npm run build` und `git diff --check` ausgefuehrt wurden, soweit fuer den Task anwendbar.
7. DB-/Rollenarbeit in nicht-produktiver Umgebung mit passenden RLS-/JWT-Tests geprueft waere; solange blockiert, wird nur ein Plan erstellt.
8. keine fremden Aenderungen ueberschrieben und keine Secrets/private Daten exponiert wurden.
9. Dokumentation, Typen und Tests bei Vertragsaenderungen aktualisiert sind.
10. Abschlussbericht Aenderungen, Verifikation, Risiken und nicht ausgefuehrte Tests nennt.
11. kein Push, Merge, Deploy oder externer Write ohne Mahles Freigabe stattfand.
