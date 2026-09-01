# App Store Readiness 5.0 — kanonischer Übergabestand 2026-09-02

Status: `HANDOFF_CANDIDATE__MERGE_AND_LIVE_VERIFICATION_REQUIRED`

Dieses Dokument ist der Einstiegspunkt für den neuen App-Store-Readiness-Task.
Es ersetzt keine erneute Git-, Supabase-, Store- oder Geräteprüfung. Historische
Statusdokumente können inzwischen überholt sein.

## 1. Rolle und Arbeitsweise

App Store Readiness 5.0 ist primär unabhängiger Release-Gatekeeper,
Produktionskoordinator und Wahrheitsinstanz, nicht automatisch der Builder für
jeden anderen Task.

- Zuerst den aktuellen Git-, Backend-, Store- und Gerätebeleg prüfen.
- Status immer als `NOTED`, `BUILT`, `TESTED_LOCAL`, `ACTIVE`, `BLOCKED` oder
  `DONE` unterscheiden. Ein grüner Test, HTTP 200 oder Upload beweist keine
  Gerätefunktion oder Store-Freigabe.
- Andere Builder liefern feste SHAs und Handoffs; 5.0 prüft den exakten Stand
  unabhängig vor Merge, Deploy, Build oder Store-Schritt.
- Push, Merge, Deploy, Production/Auth/Consent/Minor/Privacy-Schreibvorgänge,
  externe Kommunikation und Store-Aktionen nur mit passender aktueller
  Freigabe von Mahle.
- Während Mahle Gedanken in den laufenden Auftrag einstreut, jeden Punkt sofort
  als `aktueller Fix`, `aktuelle Version`, `späteres To-do` oder `Beobachtung`
  einordnen, festhalten und anschließend zum Hauptauftrag zurückkehren.
- Keine Wirksamkeits-, Kausal-, Diagnose-, Personenprofil- oder
  Lock-Screen-Zustellbehauptung aus Aktivität, Korrelation oder Providerannahme.

## 2. Git-Wahrheit bei Erstellung

- Remote-Basis: `origin/main`
- geprüfte Basis-SHA: `88b6ed2b872a88028596112319331cf07980e1d1`
- Integrationsbranch: `codex/app-store-readiness-5-integration-20260902`
- Worktree:
  `/Users/NeuroRewiremahle/Social Media/RewirePerform/worktrees/app-store-readiness-5-integration-20260902`
- Integration vor diesem Dokument:
  - `ae0eea3` — Pre-Training-Abschluss persistent und zeitgebunden;
  - `ae3b07c` — Coach-Development-Daten bei temporären Fehlern erhalten;
  - `88833ee` — reale PostgREST-Transportfehler korrekt klassifizieren;
  - `a9208a1` — Athleten-Programmtag nach Run-Zeitzone und ohne Seitenreload;
  - `53a6a10` — Pre-Training auch live und beim Speichern ab Trainingsstart schließen.
- Der historische Branch
  `codex/v1-3-team-onboarding-questionnaire-open-text-20260830` ist durch
  `ae0eea3` und `53a6a10` fachlich ersetzt. Seinen alten iOS-Buildsprung 20 und
  sein ungetracktes `build/` nicht übernehmen oder löschen.

Der neue Task muss nach Abschluss des Merge erneut `origin/main`, Ancestry,
Worktree-Status und den tatsächlichen Deploy-Stand prüfen; nicht von dieser
Erstellungs-SHA auf den späteren Main-Stand schließen.

## 3. Produktionsstatus des Mitternachtsfixes

Supabase Production: `bqsbxesmybthwtxmowfz`.

Am 2. September wurde vor der Migration live belegt:

- Datenbankdatum: `2026-09-01`;
- Europe/Berlin-Datum: `2026-09-02`;
- alte Funktion nutzte für reale Athleten `CURRENT_DATE`;
- alle drei aktiven Runs nutzten `Europe/Berlin`.

Die freigegebene Migration
`athlete_effective_today_timezone_rollover` wurde erfolgreich angewendet. Der
Read-only-Nachbeleg bestätigte:

- Run-Zeitzone wird verwendet und gegen `pg_timezone_names` validiert;
- Self-/Admin-Guard ist enthalten;
- `anon` besitzt kein Execute-Recht;
- `authenticated` besitzt Execute-Recht;
- drei aktive Runs, alle `Europe/Berlin`, keine ungültige aktive Zeitzone.

Damit ist das Backend `ACTIVE`. Der Client-Rollover bleibt bis Main-Deploy und
physischer Mitternachts-/Focus-Prüfung `TESTED_LOCAL`, nicht `DONE`.

## 4. Branch-Audit und bewusste Grenze

Alle lokalen Branches mit Commitdatum ab 27. August wurden per Ancestry und
`git cherry origin/main` geprüft. App-Navigation, Migrationshistorie,
Observability, Pilot-Run-Reparatur, Build 18, V1.3-Integration,
Alterskorrektur, E-Mail-Kollision, 56-Tage-Trennung, Coach-Kalenderserie und die
übrigen untersuchten Kandidaten sind bereits auf Main, patchgleich enthalten
oder durch spätere Integrationen ersetzt.

Absichtlich **nicht** in diesen operativen Merge aufgenommen:

- Branch `codex/v1-4-longitudinal-evidence-system-20260831`
- Commit `a9c16577e96643ad0758fbb9612ed6c1dc994884`
- Status `BUILT_LOCAL_NOT_ACTIVATED`

Dieses Paket verbindet Notification- und Check-in-Signale. Es darf erst nach
Staging-, Consent-, Zweckbindungs-, Provider-, Admin-UI-, Rechts-/Privacy- und
separaten Production-Gates aktiviert werden. Es nicht still cherry-picken,
migrieren, backfillen oder live anbinden.

## 5. Aktuell offene V1.4-Produktblöcke

### A. First-Run-/Vorstellungsflow

`OPEN / NOT IMPLEMENTED`. Coach- und Athletenvorstellung auf maximal sieben
Szenen pro Rolle verdichten und an die reale aktuelle App angleichen. Keine
neuen Claims. Pflichtabnahme bei `390x844` und `320x568`. Voller Vertrag:
`docs/V1_4_FIRST_RUN_PARITY_DENSITY_TODO_2026-09-01.md`.

### B. Team-Beobachtung und Evidence-Freigabe

Operative Coach-Teambeobachtung von späterer gemeinsamer Evidence-Freigabe
trennen. Private Coach-Notizen rollenbegrenzt; Jarvis/Exports nur freigegebene
Aggregate mit `n >= 5`; keine individuellen Consent-/Guardian-Details an den
Coach-Client. RLS, Widerruf, Retention und Tests vor Umsetzung festlegen.

### C. Longitudinales Evidence-System und Block 9

Technische Guardrails sind gebaut, Production bleibt gesperrt. Reihenfolge:

1. Quellen-Crosswalks fachlich freigeben.
2. Rechtsgrundlage, Consent, Minor/Guardian, Widerruf, Löschung, Retention,
   DPIA-Schwelle sowie Privacy-/Store-Texte prüfen.
3. Migrationen getrennt und noch deaktiviert anwenden; Advisors, Grants und
   RLS prüfen.
4. Offizielle Baseline 27.–31. August und In-Programm-Fenster ab 1. September
   getrennt genehmigen; QA/Test/alte Pre-Assessments ausschließen.
5. Identifierfreie Reconciliation.
6. Erst danach Protokoll und pseudonymisierten Backfill separat freigeben.
7. Zulässige Projektionen an Athlet, Coach, Admin und Jarvis anbinden.
8. Missingness/Versionen/Abbrüche überwachen; keine Kausalclaims.

Kanonische Details:
`docs/evidence-v1.4/REMAINING_TODOS.md` und
`docs/evidence-v1.4/BLOCK_9_PRIVACY_COMPATIBILITY.md`.

### D. Push-zu-Check-in-Evidence

Separat unterscheiden: registrierter Kanal, ausgelöster Reminder,
Providerannahme, Öffnung, Check-in-Beginn und Abschluss. Token ist kein
Berechtigungs- oder Sichtbarkeitsbeweis; Providerannahme keine Wahrnehmung;
zeitlicher Zusammenhang keine Kausalität. Nur pseudonymisiert und für
Coach/Organisation aggregiert ab `n >= 5`. Kandidat bleibt gemäß Abschnitt 4
inaktiv.

### E. Web-Push-DST

`OPEN / NOT IMPLEMENTED`: Eine lokal konfigurierte Erinnerung um 07:30 Uhr
muss nach Sommer-/Winterzeitwechsel lokal 07:30 Uhr bleiben. Lokale Uhrzeit,
Zeitzone, Resync und DST-Tests als eigener Block; nicht mit dem bereits
aktivierten Dashboard-Tageswechsel verwechseln.

### F. Externe Match-/Veo-Daten

Nur Produktidee, kein freigegebener Datenvertrag: etwa Passquote des Spiels als
getrennte Team-/Matchquelle. Vor Code müssen Datenherkunft, Rechte,
Granularität, manuelle Eingabe/Import, Instrumentversion, Aussagegrenze und
Privacy-/Evidence-Crosswalk entschieden werden. Nicht automatisch als Wirkung
von RewirePerform interpretieren.

## 6. Bereits gebaut, aber noch physisch abzunehmen

- Coach-Dashboard trennt `Heute` und gemeinsamen 7-Tage-Run-Zeitraum;
  Prozentnenner-Fix ist auf Main und Production aktiv.
- Friendly Coach-Reminder ist technisch Production-bereitgestellt, einmal pro
  Teamtag, feste Copy, Completion-Recheck und ohne private Inhalte.
- Physisch offen beziehungsweise erneut zu belegen: Coach-Web-Smoke,
  echter APNs- und Web-Push-Versand; FCM nur nach passendem Android-Token,
  Service Account und Build.
- Coach-Development-Resilience nach Main-Deploy: Hintergrundfehler erhält
  letzte gute Daten, genau ein Retry, 4xx/RLS nicht retried, kein Dashboard-Hang.
- Pre-Training nach Main-Deploy: erledigt bleibt erledigt; ab Trainingsstart
  verschwindet die offene Aktion auch bei bereits geöffneter Ansicht und kann
  nicht mehr gespeichert werden.
- Athleten-Rollover nach Main-Deploy: nach Europe/Berlin-Mitternacht und bei
  Focus/Visibility ohne Reload auf den neuen Programmtag; offener Daily-Flow
  schützt seinen Entwurf.

## 7. Store- und Release-Wahrheit

- iOS 1.3 wurde von Mahle als von Apple freigegeben berichtet. Der neue Task
  muss App Store Connect aktuell verifizieren; dieser Bericht ist kein
  Live-Beleg.
- Android-/Closed-Test-Status ist in diesem Übergabestand nicht aktuell
  verifiziert. Nicht aus alten Build-8/9-Berichten auf den heutigen Track
  schließen.
- Die hier integrierten Web-/Backend-Fixes erzeugen nicht automatisch einen
  neuen nativen Store-Build. Erst nach Scope-Entscheidung bestimmen, ob ein
  V1.4-iOS-/Android-Binary nötig ist.
- Release-Texte, Privacy-Antworten, Review-Konto/Passwort, Screenshots,
  Build-Auswahl und externe Einreichung immer gegen die tatsächlich zu
  veröffentlichende Version prüfen; Review-Zugangsdaten nicht entfernen.

## 8. Definition des nächsten Starts

Der neue Task beginnt read-only und liefert zuerst:

1. exakten `origin/main`-SHA und Beleg, dass der Integrationsmerge enthalten ist;
2. Vercel-/Website- und Supabase-Produktionsstatus;
3. offenen physischen Smoke-Umfang;
4. Store-Live-Status für iOS und Android;
5. geordnete Liste `DONE / ACTIVE / TESTED_LOCAL / OPEN / GATED`.

Erst danach wird der nächste Builder-, Merge-, Deploy- oder Store-Schritt
festgelegt.
