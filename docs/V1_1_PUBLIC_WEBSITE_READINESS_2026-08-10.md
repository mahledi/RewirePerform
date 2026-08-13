# RewirePerform V1.1 – Public Website and Demo Readiness

Status: lokal verifiziert, nicht gepusht, nicht gemergt und nicht deployed.

## Kanonische Basis und Scope

- Basis: `5f35ae3871d18582d5ef9a320fbce4520e2dece9`
- Branch: `codex/v1-1-website-quality-20260810`
- Funktionscommit: `ea25f6141265c087480aa3aea3b115bccff89498`
- Claim-Guardrail-Commit: `1aa6e2ca59b64d0c3c124d3d414cbd2da17d1fff`

Dieser Block verändert ausschließlich den öffentlichen Website- und Demo-Auftritt
sowie den zugehörigen statischen Claim-Sicherheitstest. Er verändert keine
Authentifizierung, Rollen, Minderjährigen-/Guardian-Logik, Einwilligung,
Supabase-/Datenbanklogik, Feedback-Gates, Jarvis-Verträge, native iOS-Konfiguration
oder Store-Veröffentlichung.

## Sichtbarer Stand

- Die Wissenschaftssektion verwendet die freigegebene Richtung
  „Wissenschaftliche Prinzipien. Praktisch übersetzt.“
- Die Website erklärt die verwendeten Prinzipien, trennt sie aber ausdrücklich
  vom noch offenen Wirksamkeitsnachweis des Gesamtsystems.
- Nicht belegte Aussagen zu physischem Gehirnumbau, garantierter Entwicklung,
  „100 % individueller“ Anpassung und kausalen psychologischen Effekten wurden
  entfernt.
- Der starke öffentliche Kern „Neurokognitives Performance-System“ bleibt als
  Produktbeschreibung erhalten.
- Die Website-Demo zeigt den tatsächlichen V1.1-Ablauf: Science Bite,
  verkürzte Vorschau des zehnteiligen Tages-Pulses, eine Mission,
  Verständnis-Check und Abschluss. Das private Journal bleibt als eigener
  Abendschritt getrennt.
- Die Coach-Demo verwendet reale Aktivitäts- und Programmfortschrittsarten statt
  erfundener psychologischer Wirkungswerte.
- Athleteneinladung und persönliche Co-Coach-Einladung sind klar getrennt.
- Der Abschluss der Demo führt zum bestehenden Team-/Organisationsanfrageweg.

## Browsernachweis

Geprüft wurden öffentliche Startseite und Demo bei:

- 375 × 667
- 390 × 844
- 1024 × 1366
- 1366 × 1024

Ergebnis: kein horizontaler Overflow, keine abgeschnittenen Hauptaktionen und
keine alten Wirkungsclaims. Der komplette mobile Athleten-Demoablauf, die
Coach-Tabs Entwicklung und Teams sowie die Weiterleitung zu `/team-access`
wurden durchlaufen.

Die Browserprüfung lief ausschließlich lokal mit synthetischer, netzwerkfreier
Beispielkonfiguration. Es wurden keine Secrets, echten Konten oder Produktdaten
verwendet.

## Technischer Nachweis

- `npm run ci`: grün
- 137/137 Testdateien und 772/772 Tests: grün
- TypeScript und Production-Web-Build: grün
- sämtliche SQL-, Feedback-, Minor-, Guardian-, Privacy-, Security-, Deletion-
  und statischen App-Store-Gates: grün
- `npm audit --omit=dev`: 0 Befunde
- `git diff --check`: grün
- Worktree: sauber

## Noch offene Release-Gates

1. Den separaten Rollenwahl-/Coach-First-Run-Block unabhängig prüfen und erst
   danach konfliktfrei integrieren.
2. Den finalen kombinierten Release-Commit mit bestätigter Production-Zielkonfiguration
   bauen und auf einem physischen iPhone testen.
3. App-Store-Privacy-Angaben und Review Notes gegen genau den tatsächlich
   aktivierten V1.1-Datenweg abgleichen.
4. Feedback-/Jarvis-Credentials, echter Read, Production, Push, Merge,
   TestFlight und App-Store-Einreichung bleiben jeweils getrennte externe Gates.
