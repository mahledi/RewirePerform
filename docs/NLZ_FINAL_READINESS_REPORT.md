# NLZ Final Readiness Report

Stand: 10. Juli 2026

## Urteil

**JA, ABER NUR UNTER BEDINGUNGEN.**

Der Code ist fuer einen kontrollierten Mannschaftspiloten vorbereitet. Beide neuen Migrationen wurden erfolgreich im ausgewiesenen Staging-Projekt ausgefuehrt. Die End-to-End-Matrix mit echten Athlete-, Coach- und Admin-JWTs hat 21 von 21 Checks bestanden. Vor dem produktiven Pilotstart bleiben ein mehrtaegiger Zeitlauf und ein echter iPhone/TestFlight-Test Pflicht.

## Erfuellte Code-Gates

- TypeScript Typecheck: bestanden
- Vitest: 37 von 37 Tests bestanden
- Produktionsbuild inklusive PWA Service Worker: bestanden
- ESLint: 0 Fehler, 16 nicht blockierende Hinweise
- SQL-Aussensyntax: 2 Migrationen geparst
- PL/pgSQL: 16 Funktionen geparst
- Supabase Remote Dry Run: exakt 2 erwartete Migrationen erkannt
- Staging-PostgreSQL: beide Migrationen erfolgreich angewendet
- Staging-RLS/RPC/Evidence: 21 von 21 End-to-End-Checks bestanden
- Staging-Cleanup: temporaere Konten, Team und Trackingdaten entfernt
- `git diff --check`: bestanden
- Pilot-Readiness-Ansicht: Desktop und mobiles iPhone-Viewport visuell geprueft

## Pflichtbedingungen vor Pilotstart

1. Mehrtaegigen Staging-Zeitlauf fuer Tag 2, 7, 14, 28 und 56 abschliessen.
2. TestFlight-Build auf echten iPhones mit mindestens Coach und Athlet pruefen.
3. SQL-Pruefungen aus `docs/sql/nlz-pilot-readiness-checks.sql` direkt vor dem Pilotstart ohne kritischen Befund abschliessen.
4. Produktive Migration und Deployment separat freigeben und mit Rollback-Fenster durchfuehren.
5. Erst danach Mannschaftseinladung freigeben.

## Zuverlaessig erhebbar nach bestandenem Preview-Gate

- run-spezifische Aktivierung und Programmnutzung
- eindeutige absolvierte Tage, Check-ins und Verstaendnis-Checks
- Completion Rate, Streaks, Aktivitaet und Drop-off
- Consent-Status und Pre/Mid/Post-Missingness
- aggregierte, consentierte Teamtrends ab mindestens fuenf Personen
- run-spezifische Assessment-Aggregate und beobachtete Veraenderungen
- Datenqualitaetsfehler und Zuordnungsluecken

## Nicht zulaessige Aussagen

- keine bewiesene oder verursachte Wirksamkeit
- keine Diagnose oder medizinische Wirkung
- keine individuelle psychologische Bewertung
- keine Aussage aus Gruppenwerten unter fuenf Personen
- keine belastbare Generalisierung aus kleinen oder unvollstaendigen Stichproben
- keine Interpretation historischer Daten als run-spezifisch, wenn die Instanzzuordnung fehlt

## Empfohlene Pilotgroesse

Technisches Minimum sind fuenf Athleten, weil sensible Aggregate darunter unterdrueckt werden. Fuer einen ernsthaften Mannschaftspiloten werden mindestens zehn Athleten empfohlen. Werte zwischen fuenf und neun werden als niedrige Konfidenz markiert.

## Erste 14 Tage

- Vor Start: Consent, Account, Run-Zuordnung und beide Pre-Messungen pruefen.
- Tag 1: Login, Check-in, Completion, Coach-Grenzen und Readiness kontrollieren.
- Tag 3: technische Ausfaelle, Retry-Faelle und inaktive Athleten pruefen.
- Tag 7: Adhaerenz, Missingness, Teamaggregate und Datenqualitaet auswerten.
- Tag 14: Zwischenbericht nur als beobachtete Nutzung und Veraenderung erstellen.

## Verbleibende Risiken

- Ein mehrtaegiger Staging-Zeitlauf fuer spaetere Programmtage steht noch aus.
- Ein echter TestFlight-/iPhone-Gerätetest steht noch aus.
- Historische Development-Index-Daten ohne Programminstanz bleiben bewusst ausserhalb run-spezifischer Auswertungen.
- Der Build meldet einen Bundle-Chunk ueber 500 kB; das blockiert die Tracking-Korrektheit nicht, sollte aber vor App-Store-Release separat optimiert und auf realen iPhones profiliert werden.
- Die 16 ESLint-Hinweise betreffen Fast Refresh und bestehende Hook-Abhaengigkeiten. Sie sind keine aktuellen Build- oder Tracking-Fehler, bleiben aber als technische Restschuld sichtbar.
