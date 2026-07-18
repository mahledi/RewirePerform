# Offene Fragen fuer Mahle

Update 18. Juli 2026: Frage 5 ist als Produktentscheidung geschlossen. Die technische Umsetzung liegt lokal im Branch `codex/minor-guardian-flow-20260718`; Rechts-/Privacy-Pruefung, Staging und Production-Aktivierung bleiben externe Gates. Fuer den aktuellen Vertrag gilt `docs/MINOR_GUARDIAN_FLOW_IMPLEMENTATION_SPEC_2026-07-18.md`.

## Fuenf blockierende Entscheidungen

1. **Welches Supabase-Projekt ist heute Production, welches Staging und welches nur historisch?** Relevant fuer jeden Build/Deploy. Vermutung: `bqsbxesmybthwtxmowfz` ist das eigene aktuelle Ziel; `twce...` ist historisch. Sicherheit: mittel, da CI widerspricht.
2. **Sind die Migrationen vom 10. Juli bereits produktiv angewendet oder nur im Staging?** Relevant fuer Pilot und UI-Vertraege. Vermutung: nur Staging. Sicherheit: hoch aus Readiness-Bericht.
3. **Was hat unmittelbar Vorrang: letzte NLZ-Pilotgates oder Sprachumbau Tage 1-7?** Beide sind wichtig, aber der aktive Branch und der letzte Chat zeigen unterschiedliche Reihenfolge. Vermutung: Pilot sicher abschliessen, dann Sprache. Sicherheit: niedrig bis mittel.
4. **Wie wird Account-Loeschung operativ garantiert?** Optionen: manueller dokumentierter Adminprozess oder Self-Service-Flow. Vermutung: fuer App Store soll Self-Service beziehungsweise ein wasserdichter Prozess entstehen. Sicherheit: mittel.
5. **GESCHLOSSEN ALS PRODUKTENTSCHEIDUNG:** Unter 16 Guardian-Autorisierung per direkter E-Mail plus eigene Zustimmung; 16 bis 17 eigene altersgerechte Entscheidung; Verein und Trainer haben im Guardian-Flow keine Rolle. Reale Aktivierung wartet weiterhin auf qualifizierte Rechts-/Privacy-Pruefung und technische Staging-Abnahme.

## Zehn wichtige, nicht blockierende Fragen

1. Soll die offizielle Zielgruppe dauerhaft `Athleten ab 14` lauten? Vermutung ja; hoch.
2. Soll `Mental Performance fuer Sportler` oder `fuer Athleten` die Hauptbezeichnung sein? Vermutung Athleten; mittel.
3. Soll Lint nach Bereinigung verbindlich Teil von `npm run ci` werden? Vermutung ja; mittel.
4. Soll Native Push App-Store-V1 blockieren oder nach Launch folgen? Vermutung nach Launch, sofern UI im Native Shell sauber ist; hoch.
5. Soll das Programm vor App-Store-Launch vollstaendig sprachlich ueberarbeitet sein? Vermutung mindestens kritische Tage/Flows, ideal alle 56; mittel.
6. Wer gibt wissenschaftliche Instrumente und externe Claims final frei? Vermutung Mahle plus externer Fachreview bei NLZ-Kommunikation; mittel.
7. Wie sollen bestehende rechtmaessig erzeugte Snapshots nach Consent-Widerruf behandelt werden? Vermutung organisatorische Regel mit Rechtspruefung; niedrig.
8. Soll die alte Lovable-/Migration-Dokumentation archiviert oder als historisch markiert werden? Vermutung markieren, nicht loeschen; hoch.
9. Welche realen Demo-Accounts duerfen fuer App Review gepflegt werden? Vermutung getrennte Testaccounts im eigenen Backend; hoch.
10. Wann darf MahleOS spaeter R2-Aenderungen selbststaendig als Draft vorbereiten? Vermutung nach Review dieses Packs, aber ohne Push/Merge; mittel.
