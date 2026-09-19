# Tracking Final Gate Status

Stand: 27. Juli 2026

Branch: `codex/tracking-final-gates-20260727`

Basis: `origin/main` bei `e69a100` (PR #96 integriert)

## Gesamturteil

**JA, aber nur unter klaren Bedingungen.**

RewirePerform besitzt eine starke technische Tracking- und Evidence-Basis fuer
einen kontrollierten Mannschaftspilot. Die lokale Pipeline, Datenschutzgrenzen,
Mindestgruppengroessen, Minderjaehrigenausschluesse, Data Locks und Exporte sind
umfangreich automatisiert geprueft.

Vollstaendig geschlossen sind die fuenf Abschlussgates noch nicht. Drei davon
benoetigen einen echten externen Nachweis: einen synthetischen Production-Lauf,
eine externe Rechtspruefung und 48 Stunden beaufsichtigten MahleOS-Betrieb.
Zwei technische Abschlussgates benoetigen noch Production-Abgleich und
kontrollierte Aktivierung.

Das System darf deshalb nicht als wissenschaftlich bewiesen, rechtlich final
freigegeben oder vollstaendig produktionsbewiesen bezeichnet werden.

## Gate-Status

| Gate | Status | Beleg | Noch offen |
|---|---|---|---|
| 54 privilegierte Production-Funktionen | GELB | 54. Admin-Verstaendnisfunktion live; Admin positiv, Nicht-Admin negativ, `anon`/`PUBLIC` ohne Execute; feste Suchpfade und fokussierte Rollen-Negativtests | Aeltere Migrationsversion `20260723101114` gegen Production-Version `20260723151225` reconciliieren |
| Production-Dependencies | GELB | Hohe und kritische Befunde geschlossen; zwei moderate React-Router-Hinweise verbleiben; kontrollierte interne Navigation und Regressionstests sind auf `main` | React-Router-Major-Upgrade separat planen und vollstaendig gegen Web und iOS validieren |
| Synthetischer Production-Teamlauf | BEREIT, NICHT AUSGEFUEHRT | Vollstaendiges Runbook mit Rollen-, n-, Consent-, Data-Lock-, Export- und Cleanup-Gates | Separate Freigabe fuer kontrollierte Production-Schreibvorgaenge und beaufsichtigte Ausfuehrung |
| Externe Rechtspruefung | PAKET BEREIT | Konsolidiertes Paket zu Minderjaehrigen, Consent, Retention, Loeschung, Evidence, Claims und App Privacy | Schriftliche Pruefung durch qualifizierte externe Stelle |
| MahleOS 48h Schattenbetrieb | ABNAHME DEFINIERT | Zeitplan, acht Ansichten, Privacy-Canaries, Incident-Regeln und No-false-green-Kriterien | 48 Stunden real ausfuehren und Bericht gegen Kriterien bewerten |

## Technischer Beweis

Der aktuelle isolierte Tracking-Branch hat bestanden:

- `npm run ci`
- Production-Build und PWA-Service-Worker-Build
- 82 Testdateien mit 420 Tests
- Evidence-SQL
- Admin-Verstaendnis-SQL einschliesslich `n < 5`, Testdatenausschluss und
  unbeantworteter Fragen
- Minderjaehrigen-/Guardian-SQL
- Tracking-Runtime-SQL
- MahleOS-Contract-SQL
- App-Store-Static-Gates
- Privacy-Verifikation mit 20 von 20 Regeln
- fokussierte Negativtests fuer 15 privilegierte Funktionen
- Admin-Verstaendnisansicht mit Playwright auf Desktop und iPhone-WebKit
  ohne horizontalen Seitenueberlauf
- ESLint mit 0 Fehlern und 14 bestehenden Warnungen
- `git diff --check`

`npm audit --omit=dev` bleibt formal nicht vollstaendig gruen:

- 0 kritische Befunde
- 0 hohe Befunde
- 2 moderate React-Router-Befunde

Der fuer die vorhandene SPA relevante Redirectpfad wird durch die gemeinsame
strikte Internal-Route-Funktion und Regressionstests abgefangen. Der
SSR-Hydration-Pfad ist in der Vite-`BrowserRouter`-App nicht aktiv. Ein blindes
Major-Upgrade wird trotzdem nicht als Teil dieses Tracking-Blocks erzwungen.

## Was Bereits Belastbar Ist

Das System kann technisch und datenschutzbewusst erfassen:

- Programmlauefe fuer Teams und Solo-Athleten
- taegliche Check-ins und eindeutige Tagesabschluesse
- wiederholte Transfer- und Entwicklungsbeobachtungen
- Coach-Reviews auf Team- und freigegebener Athletenebene
- Pre-/Mid-/Post-Abdeckung und Missingness
- Adhaerenz, Aktivitaet, Streaks und Verstaendnis
- interne aggregierte Hinweise darauf, ob Tagesinhalt und Anwendung verstanden
  wurden, ohne private Antworten und mit Score-Sperre unter `n < 5`
  (Production-aktiv und rollengetestet)
- consent- und guardian-abhaengige Evidence-Eignung
- Aggregate erst ab der vorgeschriebenen Mindestgruppengroesse
- versionierte Data Locks und privacy-begrenzte Exporte
- klare Trennung von QA-/Testdaten und echter Evidence

Private Journale, Reflexionstexte und unfreigegebene individuelle
psychologische Werte gehoeren nicht in Coach-, Investor-, Website- oder
MahleOS-Ausgaben.

## Zulassbare Aussagen

Nach einem erfolgreichen Pilot duerfen je nach Datenlage beispielsweise
folgende Aussagen gemacht werden:

- wie viele Athleten teilgenommen und das Programm genutzt haben;
- wie vollstaendig und regelmaessig die Messungen waren;
- welche Veraenderungen in standardisierten Selbstberichten oder
  In-App-Messungen beobachtet wurden;
- welche Veraenderungen Coaches strukturiert beobachtet haben;
- welche aggregierten Teamtrends bei ausreichender Gruppengroesse sichtbar
  waren.

Ohne geeignetes Studiendesign bleiben insbesondere unzulaessig:

- RewirePerform habe eine sportliche Leistungssteigerung bewiesen;
- RewirePerform habe einen Sieg, eine Qualifikation oder medizinische Wirkung
  verursacht;
- einzelne Athleten liessen sich psychologisch diagnostizieren;
- beobachtete Veraenderungen seien automatisch kausal durch das Programm
  entstanden.

## Reihenfolge Zum Schliessen

1. Migrationsversion `20260723101114` gegen Production-Version
   `20260723151225` reconciliieren.
2. React-Router-Major-Upgrade separat vorbereiten und den kompletten nativen
   und Web-Release-Lauf wiederholen.
3. Synthetischen Production-Teamlauf nach separater Freigabe durchfuehren.
4. Externe Rechts-/Datenschutzpruefung abschliessen.
5. MahleOS 48 Stunden im beaufsichtigten Schattenbetrieb ausfuehren.
6. Erst danach das finale Tracking-Gate auf gruen setzen.

## Arbeitsgrenzen

In diesem Block wurden keine Athleten- oder Testdaten geschrieben und keine
Edge Function deployed. Die admin-only Verstaendnis-Migration wurde nach
Merge und Freigabe in Production angewendet und negativ wie positiv
verifiziert. Der App-Store- und der MahleOS-Worktree wurden nicht veraendert.
