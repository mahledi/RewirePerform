# Engineering-Regeln

- `RP-EN-01 | CONFIRMED_FROM_BOTH` Vor Aenderungen Repository, betroffene Datenfluesse und bestehende Muster lesen.
- `RP-EN-02 | CONFIRMED_FROM_CHAT` Fragen und Analysen autorisieren keine ungefragten Codeaenderungen; explizite Umsetzungsauftraege werden dagegen Ende-zu-Ende erledigt.
- `RP-EN-03 | CONFIRMED_FROM_BOTH` Bestehende Nutzer- oder Agentenaenderungen niemals ungefragt zuruecksetzen.
- `RP-EN-04 | CONFIRMED_FROM_CODE` GitHub ist Source of Truth fuer Produktionscode; Lovable ist kein notwendiger Runtime-Kern.
- `RP-EN-05 | CONFIRMED_FROM_CODE` Supabase-Schemaaenderungen gehoeren in versionierte Migrationen; Edge Functions muessen per CLI deploybar bleiben.
- `RP-EN-06 | CONFIRMED_FROM_CODE` Produktkritische Analyse ist deterministisch; optionale AI-/Rewrite-Skripte duerfen keine Runtime-Abhaengigkeit erzeugen.
- `RP-EN-07 | CONFIRMED_FROM_BOTH` Keine produktive Migration, kein Merge, Push, Deploy oder Domain-Cutover ohne Mahles Freigabe.
- `RP-EN-08 | CONFIRMED_FROM_CODE` Runtime-Env muss explizit gesetzt sein; kein stiller Supabase-Production-Fallback.
- `RP-EN-09 | CONFIRMED_FROM_CODE` TypeScript und typisierter Supabase-Client sind Standard; `src/integrations/supabase/types.ts` folgt dem DB-Schema.
- `RP-EN-10 | CONFIRMED_FROM_BOTH` Datenzugriffe muessen RLS und Privacy-Grenzen respektieren; UI-Ausblendung allein reicht nicht.
- `RP-EN-11 | CONFIRMED_FROM_CODE` Daily Final Save ist atomar und idempotent; Snapshot folgt erst nach erfolgreichem Save.
- `RP-EN-12 | CONFIRMED_FROM_CHAT` Keine unnötigen Refactorings oder neue Abstraktionen ausserhalb des angeforderten Scopes.
- `RP-EN-13 | CONFIRMED_FROM_BOTH` Loading-, Error-, Offline- und Retry-Zustaende sind Teil der Funktion, nicht optionaler Polish.
- `RP-EN-14 | CONFIRMED_FROM_CODE` Sentry-/Event-Logging darf den Nutzerflow niemals brechen und keine privaten Inhalte aufnehmen.
- `RP-EN-15 | CONFIRMED_FROM_CODE` PWA darf kein altes `index.html` oder Chunk-Mix precachen; Hosting-Header halten HTML/SW revalidierbar und Assets immutable.
- `RP-EN-16 | CONFIRMED_FROM_CHAT` Vor Abschluss mindestens Typecheck, Tests, Build und `git diff --check`; UI zusaetzlich mobil/desktop smoke-testen.
- `RP-EN-17 | CONFIRMED_FROM_CODE` `npm run ci` ist primaeres Gate; Lint-Altlasten bleiben sichtbar und werden nicht still ignoriert.
- `RP-EN-18 | CONFIRMED_FROM_CHAT` Fehler zuerst reproduzieren und Ursache verstehen; nicht mehrere ueberlappende Workarounds stapeln.
- `RP-EN-19 | CONFIRMED_FROM_BOTH` Datenschutz- und Tracking-Tests skalieren mit Blast Radius; RLS braucht echte Rollen-JWTs in nicht-produktiver Umgebung.
- `RP-EN-20 | CONFIRMED_FROM_CHAT` Ergebnisse in klarer deutscher Sprache melden, inklusive nicht ausgefuehrter Tests und verbleibender Risiken.

## Definition of Done

1. Nutzerproblem und Scope sind klar.
2. Bestehender Datenfluss wurde nachvollzogen.
3. Aenderung ist minimal, konsistent und privacy-safe.
4. Pflichtzustaende, Fehler und Mobile-UX funktionieren.
5. `npm run typecheck`, `npm test`, `npm run build`, `git diff --check` sind gruen; bei relevantem Release `npm run ci`.
6. UI wurde im echten Flow und auf mobilem Viewport geprueft.
7. Keine fremden Aenderungen wurden ueberschrieben.
8. Kein Push/Merge/Deploy ohne ausdrueckliche Freigabe.
9. Dokumentation und Supabase-Typen sind bei Vertragsaenderungen aktualisiert.
10. Abschluss nennt Tests, Risiken und naechsten sicheren Schritt.
