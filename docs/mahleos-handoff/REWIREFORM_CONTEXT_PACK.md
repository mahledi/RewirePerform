# RewirePerform Context Pack

Stand: 11. Juli 2026. Vor jeder Arbeit zuerst `git status`, aktuellen Branch, letzte Commits und betroffene Source-of-Truth-Dateien pruefen. Dieses Pack ersetzt keine Live-Verifikation von Vercel, Supabase oder App Store Connect.

## Mission und Phase

RewirePerform macht mentale Leistungsfaehigkeit fuer Athleten ab etwa 14 Jahren als konkrete taegliche Sportpraxis trainierbar. Das System verbindet ein 56-Tage-Programm, Science Bites, Aufgaben, Check-ins, Reflexion, Journal, Verstaendnis, validierte Pre/Mid/Post-Messungen, Development Index, Coach-Teamzustand und privacy-sichere Evidence.

Aktuelle Phase: kontrollierte Pilot- und Launch-Haertung. Der aktive Repo-Branch bei Extraktion ist `agent/nlz-pilot-readiness`; aktuelle Migrationen fuehren run-spezifisches Mannschaftstracking und NLZ-Readiness ein. Gleichzeitig ist der naechste grosse inhaltliche Block laut langjaehrigem Chat die verstaendliche Sprache aller 56 Tage, beginnend mit Tag 1-7. Mahle entscheidet die unmittelbare Reihenfolge.

## Architektur

```text
React/Vite/TypeScript UI
  -> Domain Logic und deterministischer TS-Content
  -> typisierter Supabase Client
  -> Auth / PostgREST / RPC / Edge Functions
  -> Postgres + RLS + versionierte Migrationen
  -> Athlet privat / Coach operativ+aggregiert / Admin readiness+evidence
```

Webhosting ist fuer Vercel vorbereitet; PWA verwendet einen minimalen Service Worker ohne App-Shell-Precache. Capacitor baut dieselbe `dist`-App als iOS-Shell mit Bundle-ID `com.rewireperform.app`. Produktkritische Analyse ist deterministisch und nicht von Lovable AI abhaengig.

## Kernregeln

1. 56-Tage-Mechanik und fachliche Bedeutung bleiben stabil; Kontext passt reale Anwendung an.
2. Content liegt kanonisch im Repository; DB speichert Zuweisung und Bearbeitung.
3. Finaler Daily Save ist atomar: Check-in vor Completion, Snapshot erst nach Erfolg, Retry idempotent.
4. Coaches sehen individuell nur operative Aktivitaet, niemals private Texte oder Einzel-Psychowerte.
5. Sensible Teamaggregate: `n < 5` verborgen; `5-9` niedrige Konfidenz.
6. Consent `false` schliesst Evidence aus, aber nicht die Produktnutzung.
7. Run-spezifische Piloten verwenden `program_runs` und zugeordnete Programminstanzen; historische Fremddaten nicht einmischen.
8. Keine Diagnose, Therapie, medizinische Wirkung, Ego-/Persoenlichkeitsbewertung oder Kausalclaim ohne geeignetes Design.
9. Evidence-Sprache: Programmnutzung, Adhaerenz, Messqualitaet, beobachtete Veraenderung, aggregierter Teamtrend.
10. GitHub und Migrationen sind technische Source of Truth; Deployment bleibt separat zu pruefen.

## Spieler- und Content-Standard

Spielertexte muessen nach einmaligem Lesen beantworten:

1. Welche reale Situation ist gemeint?
2. Was soll ich bemerken?
3. Was soll ich konkret tun?
4. Warum hilft das fuer die naechste Handlung?

Sprache ist ruhig, direkt, ernst, sportartenneutral und fuer etwa 16- bis 22-Jaehrige verstaendlich. Nicht akademisch, nicht kindlich, nicht slanghaft. Eine Aussage pro Satz. Situation zuerst, Handlung danach, Nutzen kurz. Begriffe wie `Zustandsweite`, `Defizitmodus`, `Ego-Zusatz`, `Selbstprojekt` oder `automatische Enge` vermeiden oder sofort konkret uebersetzen.

Sprachumbau: zuerst Content-Datenfluss pruefen, dann Tage 1-7 konsistent ueber Science Bite, Core Shift, Task, Journal, Verstaendnis und Missed-Day-Review bearbeiten; mobil testen; erst nach Mahles Freigabe weitere Tage.

## UI-/UX-Standard

- ruhig, hochwertig, professionell, keine generische KI-Optik.
- mobile/iPhone/Homescreen zuerst.
- neue Flow-Schritte beginnen sofort oben.
- Press-, Save-, Error-, Offline- und Retry-Feedback sind Pflicht.
- Pflichtantwort blockiert `Weiter` am aktuellen Schritt.
- Voice optional, Tippen gleichwertig; keine redundanten Voice-Tipps.
- Coach-Teamzustand: direkte Zahlen, keine dekorativen Graphen, keine Team-Bereitschaft-Gesamtzahl.
- neutrale Coach-Beobachtung, keine Anweisung oder Matchpoint-Liste.
- keine Textueberlaeufe, verschachtelten Karten oder unnötige Hilfecopy.

## Privacy und Sicherheit

Nie in Coach, Export oder Incident-Log: Journaltext, Dankbarkeit, freie Reflexion, freie Fragebogenantwort, Rohantwort, einzelner Check-in-Verlauf, individueller psychologischer Score oder Spielerlabel.

RLS/RPC erzwingt Grenzen serverseitig. Sentry ist aus der App entfernt; `app_event_log` ist Incident-Log, kein Klickstream. Secrets nie in Frontend, Chat, Commit oder Doku. QA/Test und Production muessen getrennt bleiben.

## Engineering-Regeln

- Erst lesen und Ursache verstehen, dann eng implementieren.
- Frage/Analyse bedeutet keine Mutation; expliziter Umsetzungsauftrag wird Ende-zu-Ende erledigt.
- keine fremden Aenderungen zuruecksetzen, keine destruktiven Git-Befehle.
- keine unnötigen Refactorings oder neuen Abhaengigkeiten.
- Schema nur per Migration; Supabase-Typen und Doku nach Vertragsaenderung aktualisieren.
- keine produktive Migration, RLS-/Auth-Aenderung, Merge, Push, Deploy, Domain- oder Datenoperation ohne Mahles Freigabe.
- Pflichtgate: Typecheck, Tests, Build, `git diff --check`; relevante UI mobil und desktop pruefen.
- externe Live-Zustaende nie aus Repository allein behaupten.

## Risikoklassen

- R1: Read-only Analyse/Dokumentation.
- R2: lokal reversible Copy/UI.
- R3: Kernflow, PWA, Push, Assessment, Capacitor.
- R4: Auth, Rollen, RLS, Migration, Consent, Coach-Sicht, Production.
- R5: echte Datenloeschung, Minderjaehrigenrecht, wissenschaftliche/rechtliche Endclaims.

R4/R5 immer vorher freigeben. Eine kleine Aenderung wird hochgestuft, sobald sensible Daten, externe Systeme oder wissenschaftliche Bedeutung betroffen sind.

## Aktuelle technische Lage

- Program Runs, atomarer Tracking-RPC, NLZ Readiness und Dossier sind im Code vorhanden.
- Juengster Bericht: Staging-Migration erfolgreich, 21/21 Rollen-/E2E-Checks, 37/37 Tests.
- Noch offen laut Bericht: mehrtaegiger Zeitlauf, echter iPhone/TestFlight-Test, Production-Freigabe.
- Native Push ist eigener Track; Web Push ist implementiert.
- Self-Service-Account-Loeschung ist nicht belegt.
- Bundle-/Lint-Restschuld bleibt.

## Offene Konflikte

1. Eigenes Supabase-Projekt in `supabase/config.toml`, alte Projekt-ID in CI/Deployment-Doku.
2. Migration-/Outcome-Dokumente enthalten ueberholte Lovable- und Pre-Program-Run-Zustaende.
3. NLZ Privacy Audit und juengerer Final Report widersprechen sich beim Staging-Apply; juengerer Bericht hat Vorrang fuer Staging.
4. aktiver Branch priorisiert Pilot; letzter Chat priorisiert Sprachumbau.
5. Privacy verspricht Loeschung binnen 48 Stunden, operativer Flow ist nicht belegt.
6. Minderjaehrigen-/Erziehungsberechtigten-Consent ist nicht klar dokumentiert.

Vor produktiver Arbeit `13-CONFLICTS-AND-UNCERTAINTIES.md` lesen.

## Entscheidungen, die bei Mahle bleiben

- Produktvision und Prioritaeten.
- wissenschaftliche und externe Claims.
- Umfang und Ton der Programminhalte.
- Coach-Sichtbarkeit und Privacy-Grenzen.
- Minderjaehrigen-/Vereins-Consent.
- Production-Migration, Deploy, Domain, Store Submission.
- echte Nutzerdaten, Loeschung, Migration und Supportkommunikation.
- neue KI-, Payment-, Wearable- oder Drittanbieterintegration.

## Stop-Bedingungen

Stoppen und fragen bei widerspruechlicher Production-Quelle, moeglicher Privacy-Verletzung, destruktiver Migration, fehlendem Rollback, unklarer Claim-Bedeutung, Minderjaehrigenrecht, fremden unvereinbaren Aenderungen oder jeder Aktion ausserhalb des expliziten Scopes.

## Definition of Done

Scope verstanden, Source of Truth gelesen, minimales konsistentes Diff, Privacy/Fehler/Mobile beruecksichtigt, Pflichttests gruen, echter Flow geprueft, Risiken genannt, keine fremden Aenderungen verloren, kein Push/Merge/Deploy ohne Freigabe.

## Erste Quellen

- `docs/CONTENT_LANGUAGE_STANDARD.md`
- `docs/NLZ_FINAL_READINESS_REPORT.md`
- `docs/NLZ_PRIVACY_AUDIT.md`
- `docs/NLZ_TEAM_PILOT_RUNBOOK.md`
- `docs/DEPLOYMENT.md`
- `docs/APP_STORE.md`
- `src/App.tsx`
- `src/lib/dailyTracking.ts`
- neueste Migrationen in `supabase/migrations`
- `src/test/privacyBoundaries.test.ts`
- `docs/mahleos-handoff/19-MAHLEOS-READ-API-CONTRACT.md`
