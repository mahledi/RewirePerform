# V1.5 Team-Entwicklung – lokaler Übergabestand 2026-09-05

## Status

`BUILT + TESTED_LOCAL`, noch **nicht** nach Staging oder Production ausgerollt.

Arbeitszweig: `codex/v1-5-team-development-20260905`

## Gebaut

### Spieler – eigene Entwicklung

- Unter `Entwicklung` erscheint der eigene Check-in-Verlauf.
- Die aktuelle Woche ist geöffnet; frühere Wochen sind aufklappbar.
- Stimmung, Energie, Fokus, Erholung, Motivation und Teamverbundenheit werden direkt gezeigt.
- Stress, Schlaf, Körper und Druck bleiben über `Alle Werte` erreichbar.
- Die Veränderung bezieht sich immer auf den vorherigen eigenen Check-in.
- Es werden ausschließlich durch bestehendes RLS geschützte eigene Check-ins gelesen; keine fremden Spielerwerte.

### Spieler – anonymer Mannschaftsimpuls

- `Gemeinsam dran` zeigt nur:
  - Anzahl der heute eingecheckten Spieler,
  - aktuelle Teamgröße,
  - Anzahl der in sieben Tagen aktiven Spieler.
- Bei noch fehlendem eigenen Check-in führt ein Button zurück zum Tagesbereich.
- Keine Namen, keine Rangliste, keine Anzeige fehlender Personen und keine Einzelwerte.
- Der Server leitet das Team ausschließlich aus dem angemeldeten Athleten und dessen aktivem Programmlauf ab.
- Unter fünf zugeordneten Spielern bleibt die Karte gesperrt.

### Coach – Teampuls-Verlauf

- Die aktuelle Kalenderwoche ist geöffnet; vorherige Wochen sind aufklappbar.
- Der Datenvertrag liefert den bisherigen aktiven Programmlauf bis maximal 56 Tage.
- Alle zehn Teamzustandswerte und ihre Veränderung zur vorherigen belastbaren Woche sind sichtbar.
- Tageswerte werden innerhalb der jeweiligen Woche gezeigt.
- Jeder einzelne Messwert bleibt unter `n = 5` verborgen.
- Es werden weder Identifikatoren noch Check-in-Rohwerte, Journale oder Reflexionen zurückgegeben.

## Lokale Nachweise

- TypeScript-Typprüfung: grün.
- Produktions-Build: grün.
- Gesamte Testsuite: `227` Dateien, `1209` Tests, vollständig grün.
- Neue PostgreSQL-Vertragstests legen beide RPCs real in PGlite an und führen sie mit einer synthetischen Fünfergruppe aus.
- Spieler- und Coach-Ansicht wurden auf `390 × 844` visuell geprüft; ein mobiler Überlauf wurde dabei gefunden und korrigiert.

## Read-only Live-Befund am 2026-09-05

Es wurden ausschließlich anonyme Summen gelesen, keine Namen, IDs, Antworten oder Freitexte.

- ein echter aktiver Teamlauf,
- 28 aktive, nicht als Test markierte Spielerinstanzen,
- 11 Check-ins am 5. September,
- 17 Spieler ohne heutigen Check-in,
- 25 Spieler mit mindestens einem Check-in in sieben Tagen.

Teilnahmetage seit dem offiziellen Programmstart:

- 5 Tage: 4 Spieler,
- 4 Tage: 5 Spieler,
- 3 Tage: 3 Spieler,
- 2 Tage: 5 Spieler,
- 1 Tag: 8 Spieler,
- 0 Tage: 3 Spieler.

Das stützt die Produkthypothese eines relativ festen täglichen Kerns, ohne eine Ursache wie Motivation oder Widerstand zu behaupten.

## Getrennte Grenze: longitudinales Evidence-System

Der Production-Read zeigt weiterhin:

- kein `evidence_derived.analysis_protocols`,
- keine pseudonymisierten Identity Links,
- keine longitudinalen Evidence-Messungen,
- kein Athlete-Evidence-RPC,
- kein Activation-Readiness-RPC.

Das heißt: Das V1.4-Evidence-System ist in Production nicht installiert und nicht aktiv. Diese V1.5-Arbeit aktiviert es bewusst nicht. Vor realer Evidence-Aktivierung bleiben externe Rechtsprüfung, kompakte DSFA, Quellen-Crosswalks, Store-/Privacy-Abgleich, Pilotfenster, Reconciliation und separat freigegebener Backfill erforderlich.

## Nächster freizugebender Schritt

1. Die zwei neuen V1.5-Migrationen zuerst kontrolliert anwenden.
2. Security Advisors und Grant-/Rollen-Smoke prüfen.
3. `team-mental-state` Edge Function bereitstellen.
4. Website/App bereitstellen und mit einem echten Spieler- und Coach-Konto physisch prüfen.
5. Longitudinales Evidence-System weiterhin separat und geschlossen halten.
